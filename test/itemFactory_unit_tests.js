const { expect } = require("chai");

describe("ItemFactory Contract Test", async function () {
  let milk;
  let itemFactory;

  let owner;
  let admin;
  let depositor;
  let master;
  let game;
  let user;

  beforeEach(async function () {
    [owner, admin, depositor, master, game, user] = await ethers.getSigners();

    const Milk = await ethers.getContractFactory("Milk");
    milk = await Milk.deploy("MilkToken", "MILK");
    await milk.deployed();

    const ItemFactory = await ethers.getContractFactory("ItemFactory");
    itemFactory = await ItemFactory.deploy("placeholderuri/{id}", milk.address);
  });

  it("Only deployer should have DEFAULT_ADMIN_ROLE", async function () {
    const role = await itemFactory.DEFAULT_ADMIN_ROLE();
    let hasRole = await itemFactory.hasRole(role, owner.address);
    expect(hasRole).to.be.eq(true);
    hasRole = await itemFactory.hasRole(role, user.address);
    expect(hasRole).to.be.eq(false);
  });


  it("Should set valid rarity rolls", async function () {
    const adminRole = await itemFactory.ADMIN_ROLE();
    await itemFactory.grantRole(adminRole, admin.address);

    const _commonRoll = 50;
    const _uncommonRoll = 75;
    const _rareRoll = 85;
    const _epicRoll = 92;
    const _legendaryRoll = 100;
    const _maxRarityRoll = 100;

    await expect(
      itemFactory
        .connect(admin)
        .setRarityRolls(
          _commonRoll,
          _commonRoll - 1,
          _rareRoll,
          _epicRoll,
          _legendaryRoll,
          _maxRarityRoll
        )
    ).to.be.revertedWith("Common must be less rare than uncommon");

    await expect(
      itemFactory
        .connect(admin)
        .setRarityRolls(
          _commonRoll,
          _uncommonRoll,
          _uncommonRoll - 1,
          _epicRoll,
          _legendaryRoll,
          _maxRarityRoll
        )
    ).to.be.revertedWith("Uncommon must be less rare than rare");

    await expect(
      itemFactory
        .connect(admin)
        .setRarityRolls(
          _commonRoll,
          _uncommonRoll,
          _rareRoll,
          _rareRoll - 1,
          _legendaryRoll,
          _maxRarityRoll
        )
    ).to.be.revertedWith("Rare must be less rare than epic");

    await expect(
      itemFactory
        .connect(admin)
        .setRarityRolls(
          _commonRoll,
          _uncommonRoll,
          _rareRoll,
          _epicRoll,
          _epicRoll - 1,
          _maxRarityRoll
        )
    ).to.be.revertedWith("Epic must be less rare than legendary");

    await expect(
      itemFactory
        .connect(admin)
        .setRarityRolls(
          _commonRoll,
          _uncommonRoll,
          _rareRoll,
          _epicRoll,
          _legendaryRoll,
          _legendaryRoll - 1
        )
    ).to.be.revertedWith(
      "Legendary rarity level must be less than or equal to the max rarity roll"
    );
  });

  describe("ItemFactory Claim Test", async function () {
    let rewardData;

    beforeEach(async function () {
      const role = await milk.CONTRACT_ROLE();
      await milk.grantRole(role, itemFactory.address);

      const adminRole = await itemFactory.ADMIN_ROLE();
      rewardData = [
        [
          {
            min: ethers.utils.parseUnits("100", 18),
            max: ethers.utils.parseUnits("200", 18),
            ids: [],
          },
          {
            min: ethers.utils.parseUnits("150", 18),
            max: ethers.utils.parseUnits("300", 18),
            ids: [],
          },
          {
            min: ethers.utils.parseUnits("250", 18),
            max: ethers.utils.parseUnits("500", 18),
            ids: [],
          },
          {
            min: ethers.utils.parseUnits("400", 18),
            max: ethers.utils.parseUnits("700", 18),
            ids: [],
          },
          {
            min: ethers.utils.parseUnits("700", 18),
            max: ethers.utils.parseUnits("1000", 18),
            ids: [],
          },
        ],
        [
          {
            min: 1,
            max: 2,
            ids: [1, 2],
          },
          {
            min: 2,
            max: 4,
            ids: [1, 2, 3],
          },
          {
            min: 4,
            max: 8,
            ids: [3, 4, 5],
          },
          {
            min: 8,
            max: 16,
            ids: [4, 5],
          },
          {
            min: 12,
            max: 24,
            ids: [],
          },
        ],
      ];

      await itemFactory.grantRole(adminRole, admin.address);

      for (let type = 0; type < 2; type++) {
        for (let rarity = 0; rarity < 5; rarity++) {
          const data = rewardData[type][rarity];
          const bytes = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256", "uint256[]"],
            [data.min, data.max, data.ids]
          );
          await itemFactory.connect(admin).setReward(type, rarity, bytes);
        }
      }
    });

    it("Can only claim once", async function () {
      const entropy = 100;
      await itemFactory.connect(user).claim(user.address, entropy);

      const secsPerDay = 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [secsPerDay / 2]);

      await expect(
        itemFactory.connect(user).claim(user.address, entropy)
      ).to.be.revertedWith("can claim once a day");
    });

    it("Claim again after 24 hours", async function () {
      const entropy = 100;
      await itemFactory.connect(user).claim(user.address, entropy);

      const secsPerDay = 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [secsPerDay]);

      await itemFactory.connect(user).claim(user.address, entropy);
    });
  });
});