pragma solidity ^0.4.4;

contract Owned {
  address public owner;

  event LogInitializedOwner(address _owner);

  function Owned() {
    owner = msg.sender;
    LogInitializedOwner(msg.sender);
  }

  modifier onlyOwner {
    require(msg.sender == owner);
    _;
  }

  function kill() {
    if (msg.sender == owner) {
      selfdestruct(owner);
    }
  }
}
