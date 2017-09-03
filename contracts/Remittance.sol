pragma solidity ^0.4.4;

import "./Owned.sol";
import "./HashLib.sol";


contract Remittance is Owned {
  bytes32 public secretHash;
  address public receiver;
  uint public balance;

  event LogInitialized(address _receiver, uint _amount, bytes32 _secretHash);
  event LogDeposit(address _sender, uint _amount);
  event LogWithdrawal(address _receiver, uint _amount);
  event LogFundsClaimed(address _receiver, uint _amount);

  function Remittance(address _receiver, bytes32 _secretHash) public payable {
    require(_receiver != 0);

    balance = msg.value;
    secretHash = _secretHash;
    receiver = _receiver;

    LogInitialized(receiver, balance, _secretHash);
  }

  function deposit() public payable {
    require(msg.value > 0);

    balance += msg.value;
    LogDeposit(msg.sender, msg.value);
  }

  // get the money if you have the secrets
  function withdraw(bytes32 hashA, bytes32 hashB) public {
    require(balance > 0);
    require(msg.sender == receiver);

    require(HashLib.multiHash(hashA, hashB) == secretHash);

    balance = 0;
    msg.sender.transfer(balance);
    LogWithdrawal(msg.sender, balance);
  }

  // owner can claim funds
  function claim() public onlyOwner {
    balance = 0;
    owner.transfer(balance);

    LogFundsClaimed(owner, balance);
  }
}
