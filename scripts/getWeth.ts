import { network, getNamedAccounts, ethers } from "hardhat";
import { IWeth } from "../typechain-types";

export const AMOUNT = ethers.utils.parseEther("0.02");

export async function getWeth() {
  const { deployer } = await getNamedAccounts();

  const iWeth: IWeth = await ethers.getContractAt(
    "IWeth",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    deployer
  );

  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`Got ${wethBalance.toString()} WETH`);
}
