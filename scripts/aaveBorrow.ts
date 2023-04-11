import { BigNumber } from "ethers";
import { getNamedAccounts, ethers } from "hardhat";
import {
  AggregatorV3Interface,
  IERC20,
  ILendingPool,
  ILendingPoolAddressesProvider,
} from "../typechain-types";
import { getWeth, AMOUNT } from "./getWeth";

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();

  //Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5

  const lendingPool = await getLendingPool(deployer);
  console.log(`LendingPool address ${lendingPool.address}`);

  //approve the lending pool to take our eth
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  //deposit to lending pool
  console.log("Depositing...");
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited!");

  //how much we have borrowed, how much we have in collateral, how much we can borrow
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );

  // What is conversion rate of availableBorrowsETH to DAI
  const daiPrice = await getDaiPrice();
  const amountOfDaiToBorrow = availableBorrowsETH.div(daiPrice);

  const amountOfDaiToBorrowWei = ethers.utils.parseEther(
    amountOfDaiToBorrow.toString()
  ); //DAI has 18 decimal places like ether so we can use parseEther
  console.log(`you can borrow ${amountOfDaiToBorrow.toString()} DAI`);

  //Borrowing
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(
    daiTokenAddress,
    lendingPool,
    amountOfDaiToBorrowWei,
    deployer
  );

  await getBorrowUserData(lendingPool, deployer);

  //repay
  await repayDai(
    amountOfDaiToBorrowWei,
    daiTokenAddress,
    lendingPool,
    deployer
  );
  // there will still be some borrowed left because of the interest accrued on our debt
  // we can swap our eth to dai (using uniswap) and pay it back
  await getBorrowUserData(lendingPool, deployer);
}

async function repayDai(
  amount: BigNumber,
  daiAddress: string,
  lendingPool: ILendingPool,
  account: string
) {
  //approve the lending pool contract to take the dai back
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repayTx.wait(1);
  console.log("Dai Repayed!");
}

async function borrowDai(
  daiAddress: string,
  lendingPool: ILendingPool,
  amountOfDaiToBorrowWei: BigNumber,
  account: string
) {
  // 1 is for stable interest rate
  // 0 is for referral code
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountOfDaiToBorrowWei,
    1,
    0,
    account
  );
  await borrowTx.wait(1);
  console.log("You have borrowed!");
}

async function getDaiPrice(): Promise<BigNumber> {
  // we don't need to pass the signer account because we are only reading data
  const daiEthPriceFeed: AggregatorV3Interface = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${price.toString()}`);
  return price;
}

async function getBorrowUserData(lendingPool: ILendingPool, account: string) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);

  console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);

  return { availableBorrowsETH, totalDebtETH };
}

async function getLendingPool(account: string): Promise<ILendingPool> {
  const lendingPoolAddressesProvider: ILendingPoolAddressesProvider =
    await ethers.getContractAt(
      "ILendingPoolAddressesProvider",
      "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
      account
    );

  const lendingPoolAddress =
    await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool: ILendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}

async function approveErc20(
  tokenAddress: string,
  spenderAddress: string,
  amountToSpend: BigNumber,
  account: string
) {
  const erc20Token: IERC20 = await ethers.getContractAt(
    "IERC20",
    tokenAddress,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
