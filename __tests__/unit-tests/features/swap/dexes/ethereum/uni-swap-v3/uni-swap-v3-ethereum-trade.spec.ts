import { Injector } from '@core/sdk/injector';
import { Chain } from '__tests__/utils/chain';
import { mockInjector } from '__tests__/utils/mock-injector';
import { TOKENS } from '__tests__/utils/tokens';
import BigNumber from 'bignumber.js';
import { BLOCKCHAIN_NAME, Web3Public } from 'src/core';
import { PriceTokenAmount } from 'src/core/blockchain/tokens/price-token-amount';
import { PriceToken } from 'src/core/blockchain/tokens/price-token';
import { TransactionReceipt } from 'web3-eth';
import { UniSwapV3EthereumProvider } from '@features/swap/dexes/ethereum/uni-swap-v3-ethereum/uni-swap-v3-ethereum-provider';
import fn = jest.fn;

describe('UniSwap V3 Ethereum trade tests.', () => {
    let chain: Chain;
    let uniswapV3Provider: UniSwapV3EthereumProvider;
    let web3Public: Web3Public;
    let userAddress: string;

    const getTransactionFeeByReceipt = async (
        transactionReceipt: TransactionReceipt
    ): Promise<BigNumber> => {
        const transaction = (await web3Public.getTransactionByHash(
            transactionReceipt.transactionHash
        ))!;
        return new BigNumber(transactionReceipt.gasUsed).multipliedBy(transaction.gasPrice);
    };

    const getTransactionFeeByHash = async (transactionHash: string): Promise<BigNumber> => {
        const transaction = (await web3Public.getTransactionByHash(transactionHash))!;
        const transactionReceipt = (await chain.web3.eth.getTransactionReceipt(transactionHash))!;
        return new BigNumber(transactionReceipt.gasUsed).multipliedBy(transaction.gasPrice);
    };

    beforeAll(async () => {
        uniswapV3Provider = new UniSwapV3EthereumProvider();
    });

    beforeEach(async () => {
        chain = await Chain.reset(BLOCKCHAIN_NAME.ETHEREUM);
        const configuration = await chain.getConfiguration();
        await mockInjector(configuration);
        web3Public = Injector.web3PublicService.getWeb3Public(BLOCKCHAIN_NAME.ETHEREUM);
        userAddress = Injector.web3Private.address;
    });

    test('Swap method must works with NATIVE-ERC20 trade', async () => {
        const ethTokenAmountToSwap = 1;
        const expectedToTokensAmount = '3177.56875989798300356'; // constant data about tokens rate in 13961175 block
        const ethBalanceBefore = await web3Public.getBalance(userAddress);
        const daiBalanceBefore = await web3Public.getBalance(userAddress, TOKENS.DAI.address);
        const from = await PriceTokenAmount.createFromToken({
            ...TOKENS.ETH,
            tokenAmount: new BigNumber(ethTokenAmountToSwap)
        });
        const to = await PriceToken.createFromToken(TOKENS.DAI);

        const trade = await uniswapV3Provider.calculate(from, to, { gasCalculation: 'disabled' });
        const transactionReceipt = await trade.swap();
        const ethBalanceAfter = await web3Public.getBalance(userAddress);
        const daiBalanceAfter = await web3Public.getBalance(userAddress, TOKENS.DAI.address);
        const transactionFee = await getTransactionFeeByReceipt(transactionReceipt);

        expect(transactionReceipt.status).toBeTruthy();
        expect(
            ethBalanceAfter.isEqualTo(
                ethBalanceBefore
                    .minus(ethTokenAmountToSwap * 10 ** TOKENS.ETH.decimals)
                    .minus(transactionFee)
            )
        ).toBeTruthy();
        expect(
            daiBalanceAfter.isEqualTo(
                daiBalanceBefore.plus(
                    new BigNumber(expectedToTokensAmount).multipliedBy(10 ** TOKENS.DAI.decimals)
                )
            )
        ).toBeTruthy();

        const trade1 = await uniswapV3Provider.calculate(from, to, { gasCalculation: 'disabled' });
        expect(trade1.to.weiAmount.isEqualTo(trade.to.weiAmount)).not.toBeTruthy();
    }, 10_000);

    test('Swap method must works with ERC20-NATIVE trade', async () => {
        const usdtTokenAmountToSwap = 1;
        const expectedToTokensAmount = '0.000314923189705958'; // constant data about tokens rate in 13961175 block
        const from = await PriceTokenAmount.createFromToken({
            ...TOKENS.USDT,
            tokenAmount: new BigNumber(usdtTokenAmountToSwap)
        });
        const to = await PriceToken.createFromToken(TOKENS.ETH);
        await chain.increaseTokensBalance(from, usdtTokenAmountToSwap, { inEtherUnits: true });
        const usdtBalanceBefore = await web3Public.getBalance(userAddress, from.address);
        const ethBalanceBefore = await web3Public.getBalance(userAddress);
        let approveTxHash = '';

        const onApprove = fn(hash => (approveTxHash = hash));
        const trade = await uniswapV3Provider.calculate(from, to, { gasCalculation: 'disabled' });
        const transactionReceipt = await trade.swap({ onApprove });
        const usdtBalanceAfter = await web3Public.getBalance(userAddress, from.address);
        const ethBalanceAfter = await web3Public.getBalance(userAddress);
        const approveTransactionFee = await getTransactionFeeByHash(approveTxHash);
        const transactionFee = await getTransactionFeeByReceipt(transactionReceipt);

        expect(transactionReceipt.status).toBeTruthy();
        expect(
            usdtBalanceAfter.isEqualTo(
                usdtBalanceBefore.minus(usdtTokenAmountToSwap * 10 ** from.decimals)
            )
        ).toBeTruthy();

        expect(
            ethBalanceAfter.isEqualTo(
                ethBalanceBefore
                    .plus(new BigNumber(expectedToTokensAmount).multipliedBy(10 ** to.decimals))
                    .minus(approveTransactionFee)
                    .minus(transactionFee)
            )
        ).toBeTruthy();
        expect(onApprove.mock.calls.length).toBe(1);
    }, 10_000);

    test('Swap method must works with ERC20-ERC20 trade', async () => {
        const usdtTokenAmountToSwap = 1;
        const expectedToTokensAmount = '1.02692208070202167'; // constant data about tokens rate in 13961175 block
        const from = await PriceTokenAmount.createFromToken({
            ...TOKENS.USDT,
            tokenAmount: new BigNumber(usdtTokenAmountToSwap)
        });
        const to = await PriceToken.createFromToken(TOKENS.DAI);
        await chain.increaseTokensBalance(from, usdtTokenAmountToSwap, { inEtherUnits: true });
        const usdtBalanceBefore = await web3Public.getBalance(userAddress, from.address);
        const daiBalanceBefore = await web3Public.getBalance(userAddress, to.address);

        const trade = await uniswapV3Provider.calculate(from, to, { gasCalculation: 'disabled' });
        const transactionReceipt = await trade.swap();
        const usdtBalanceAfter = await web3Public.getBalance(userAddress, from.address);
        const daiBalanceAfter = await web3Public.getBalance(userAddress, to.address);

        expect(transactionReceipt.status).toBeTruthy();
        expect(
            usdtBalanceAfter.isEqualTo(
                usdtBalanceBefore.minus(usdtTokenAmountToSwap * 10 ** from.decimals)
            )
        ).toBeTruthy();

        expect(
            daiBalanceAfter.isEqualTo(
                daiBalanceBefore.plus(
                    new BigNumber(expectedToTokensAmount).multipliedBy(10 ** to.decimals)
                )
            )
        ).toBeTruthy();
    }, 10_000);
});
