pragma solidity ^0.4.4;

import "./Owned.sol";
import "./HashLib.sol";


/**
* This contract lets a user send money to another user while requiring
* two secrets to withdraw the funds. The sender can set a deadline for
* withdrawal no more than 10 blocks into the future, after which the
* contract owner can claim the funds.
*/
contract Remittance is Owned {
  struct RemittanceInfo {
    bytes32 secretHash;
    address receiver;
    uint balance;
    uint deadline;
  }

  mapping (bytes32 => RemittanceInfo) public remittances;
  mapping (bytes32 => bool) public secretUsed;
  uint public maxDeadlineOffset = 10;

  event LogRemittanceCreated(address _sender, address _receiver, uint _amount, bytes32 _secretHash, uint deadline);
  event LogWithdrawal(address _receiver, uint _amount);
  event LogFundsClaimed(address _receiver, uint _amount);

  function Remittance() public {}

  function createRemittance(address _receiver, bytes32 _secretHash, uint deadline)
    public
    payable
    returns(bool success)
  {
    require(msg.value > 0);
    require(_receiver != 0);
    require(deadline <= block.number + maxDeadlineOffset);

    // fail if secret already used
    require(secretUsed[_secretHash] == false);

    // otherwise, make a new one
    RemittanceInfo memory r = RemittanceInfo({
      secretHash: _secretHash,
      receiver: _receiver,
      balance: msg.value,
      deadline: deadline
    });
    remittances[_secretHash] = r;

    LogRemittanceCreated(msg.sender, _receiver, msg.value, _secretHash, deadline);

    // mark secret as used
    secretUsed[_secretHash] = true;

    return true;
  }

  // get the money if you have the secrets
  function withdraw(bytes32 hashA, bytes32 hashB)
    public
    returns(bool success)
  {
    bytes32 secretHash = HashLib.multiHash(hashA, hashB);

    RemittanceInfo memory r = remittances[secretHash];
    require(r.receiver != 0);
    require(r.balance > 0);
    require(msg.sender == r.receiver);

    uint amount = r.balance;
    remittances[secretHash].balance = 0;
    msg.sender.transfer(amount);
    LogWithdrawal(msg.sender, amount);

    return true;
  }

  // owner can claim funds after deadline
  function claim(bytes32 secretHash)
    public
    onlyOwner
    returns(bool success)
  {
    RemittanceInfo memory r = remittances[secretHash];

    require(r.deadline <= block.number);
    require(r.balance > 0);
    uint amount = r.balance;
    remittances[secretHash].balance = 0;
    owner.transfer(amount);

    LogFundsClaimed(owner, amount);

    return true;
  }
}
