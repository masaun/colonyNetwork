/* globals artifacts */
/* eslint-disable no-console */

const assert = require("assert");

const Token = artifacts.require("../lib/colonyToken/contracts/Token");
const IColonyNetwork = artifacts.require("./IColonyNetwork");
const ITokenLocking = artifacts.require("./ITokenLocking");
const EtherRouter = artifacts.require("./EtherRouter");
const TokenAuthority = artifacts.require("../lib/colonyToken/contracts/TokenAuthority");

module.exports = deployer => {
  // Create the meta colony
  let colonyNetwork;
  let tokenLocking;
  let clnyToken;
  deployer
    .then(() => EtherRouter.deployed())
    .then(_etherRouter => IColonyNetwork.at(_etherRouter.address))
    .then(instance => {
      colonyNetwork = instance;
      return Token.new("Colony Network Token", "CLNY", 18);
    })
    .then(tokenInstance => {
      clnyToken = tokenInstance;
      return clnyToken.mint(10000000000000000);
    })
    .then(() => TokenAuthority.new(clnyToken.address, 0x0))
    .then(tokenAuthority => {
      clnyToken.setAuthority(tokenAuthority.address);
    })
    // These commands add the first address as a reputation miner. This isn't necessary (or wanted!) for a real-world deployment,
    // but is useful when playing around with the network to get reputation mining going.
    .then(() => colonyNetwork.createMetaColony(clnyToken.address))
    .then(() => colonyNetwork.getTokenLocking())
    .then(address => {
      tokenLocking = address;
      return clnyToken.approve(tokenLocking, "10000000000000000");
    })
    .then(() => ITokenLocking.at(tokenLocking))
    .then(iTokenLocking => iTokenLocking.deposit(clnyToken.address, "10000000000000000"))
    .then(() => colonyNetwork.initialiseReputationMining())
    .then(() => colonyNetwork.startNextCycle())
    .then(() => colonyNetwork.getSkillCount())
    .then(skillCount => {
      assert.equal(skillCount.toNumber(), 3);
      return colonyNetwork.getMetaColony();
    })
    .then(async metaColonyAddress => {
      // Doing an async / await here because we need this promise to resolve (i.e. tx to mine) and we also want
      // to log the address. It's either do this, or do `return colonyNetwork.getMetaColony()` twice. I'm easy on
      // which we use.
      await clnyToken.setOwner(metaColonyAddress);
      console.log("### Meta Colony created at", metaColonyAddress);
    })
    .catch(err => {
      console.log("### Error occurred ", err);
    });
};
