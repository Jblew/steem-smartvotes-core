import { expect, assert } from "chai";
import { Promise } from "bluebird";
import "mocha";
import * as _ from "lodash";
import { AuthorsRule, SendVoteorder, Wise, ValidationException, TagsRule, WeightRule, SteemOperationNumber, SetRules } from "../src/wise";

import * as fakeDataset_ from "./data/fake-blockchain.json";
const fakeDataset = fakeDataset_ as object as FakeApi.Dataset;

import { FakeApi } from "../src/api/FakeApi";

const delegator = "nonexistent-delegator-" + Date.now();
const voterA = "nonexistent-voter-a-" + Date.now();
const voterB = "nonexistent-voter-b-" + Date.now();
const voterC = "nonexistent-voter-c-" + Date.now();
const fakeApi: FakeApi = FakeApi.fromDataset(fakeDataset);

const delegatorWise = new Wise(delegator, fakeApi);
const voterAWise = new Wise(voterA, fakeApi);
const voterBWise = new Wise(voterB, fakeApi);
const voterCWise = new Wise(voterC, fakeApi);


describe("test/rules-updater.spec.ts", () => {
    describe("RulesUpdater", function() {
        const rules0: { voter: string, rules: SetRules } [] = [
            {
                voter: voterA,
                rules: {
                    rulesets: [{
                        name: "a",
                        rules: [
                            new WeightRule(WeightRule.Mode.SINGLE_VOTE_WEIGHT, 0, 100),
                            new TagsRule(TagsRule.Mode.REQUIRE, ["steemprojects"])
                        ]
                    }]
                }
            },
            {
                voter: voterB,
                rules: {
                    rulesets: [{
                        name: "b",
                        rules: [
                            new AuthorsRule(AuthorsRule.Mode.ALLOW, ["noisy"])
                        ]
                    }]
                }
            }
        ];
        it("Sets initial rules", () => {
            return delegatorWise.diffAndUpdateRulesAsync(rules0)
            .then((result: SteemOperationNumber | true) => {
                expect(result !== true, "rules were actually updated").to.be.true;
                expect((result as SteemOperationNumber).blockNum).to.be.greaterThan(0);
            })
            .then(() => Promise.delay(10))
            .then(() => voterAWise.getRulesetsAsync(delegator))
            .then((rules: SetRules) => {
                expect(rules.rulesets).to.be.an("array").with.length(1);
                expect(rules.rulesets[0].name).to.be.equal("a");
                expect(rules.rulesets).to.deep.equal(rules0[0].rules.rulesets);
                expect(_.isEqual(rules.rulesets, rules0[0].rules.rulesets), "_.isEqual").to.be.true;
            })
            .then(() => voterBWise.getRulesetsAsync(delegator))
            .then((rules: SetRules) => {
                expect(rules.rulesets).to.be.an("array").with.length(1);
                expect(rules.rulesets).to.deep.equal(rules0[1].rules.rulesets);
                expect(_.isEqual(rules.rulesets, rules0[1].rules.rulesets), "_.isEqual").to.be.true;
            });
        });


        it("Does not update same rules", () => {
            return Promise.delay(10)
            .then(() => delegatorWise.diffAndUpdateRulesAsync(rules0))
            .then((result: SteemOperationNumber | true) => {
                expect(result === true, "rules were not updated").to.be.true;
            });
        });


        const rules1 = _.cloneDeep(rules0);
        const additionalRuleForVoterC = {
                voter: voterC,
                rules: {
                    rulesets: [{
                        name: "c",
                        rules: [
                            new WeightRule(WeightRule.Mode.SINGLE_VOTE_WEIGHT, 0, 100),
                            new TagsRule(TagsRule.Mode.REQUIRE, ["steemprojects"])
                        ]
                    }]
                }
            };
        rules1.push(additionalRuleForVoterC);

        it("Updates on added new voter", () => {
            return Promise.delay(10)
            .then(() => delegatorWise.diffAndUpdateRulesAsync(rules1))
            .then((result: SteemOperationNumber | true) => {
                expect(result !== true, "rules were actually updated").to.be.true;
                expect((result as SteemOperationNumber).blockNum).to.be.greaterThan(0);
            })
            .then(() => Promise.delay(10))
            .then(() => voterCWise.getRulesetsAsync(delegator))
            .then((rules: SetRules) => {
                expect(rules.rulesets).to.be.an("array").with.length(1);
                expect(rules.rulesets[0].name).to.be.equal("c");
                expect(rules.rulesets).to.deep.equal(rules1[2].rules.rulesets);
            });
        });

        const rules2 = _.slice(_.cloneDeep(rules1), 1); // remove first element
        it("Updates on removed voter", () => {
            return Promise.delay(10)
            .then(() => delegatorWise.diffAndUpdateRulesAsync(rules2))
            .then((result: SteemOperationNumber | true) => {
                expect(result !== true, "rules were actually updated").to.be.true;
                expect((result as SteemOperationNumber).blockNum).to.be.greaterThan(0);
            })
            .then(() => Promise.delay(25))
            .then(() => voterAWise.getRulesetsAsync(delegator))
            .then((rules: SetRules) => {
                expect(rules.rulesets).to.be.an("array").with.length(0);
            });
        });

        const rules3 = _.cloneDeep(rules2); // modify rules for voter c
        (rules3[rules3.length - 1].rules.rulesets[0].rules[0] as WeightRule).max = 50;
        it("Updates on modified weight rule numbered property", () => {
            return Promise.delay(10)
            .then(() => delegatorWise.diffAndUpdateRulesAsync(rules3))
            .then((result: SteemOperationNumber | true) => {
                expect(result !== true, "rules were actually updated").to.be.true;
                expect((result as SteemOperationNumber).blockNum).to.be.greaterThan(0);
            })
            .then(() => Promise.delay(25))
            .then(() => voterCWise.getRulesetsAsync(delegator))
            .then((rules: SetRules) => {
                expect(rules.rulesets).to.be.an("array").with.length(1);
                expect(rules.rulesets[0].name).to.be.equal("c");
                expect(rules.rulesets).to.deep.equal(rules3[rules3.length - 1].rules.rulesets);
            });
        });

        const rules4 = _.cloneDeep(rules3); // modify rules for voter c
        (rules4[rules4.length - 1].rules.rulesets[0].rules[1] as TagsRule).mode = TagsRule.Mode.DENY;
        it("Updates on modified tags rule enum property", () => {
            return Promise.delay(10)
            .then(() => delegatorWise.diffAndUpdateRulesAsync(rules4))
            .then((result: SteemOperationNumber | true) => {
                expect(result !== true, "rules were actually updated").to.be.true;
                expect((result as SteemOperationNumber).blockNum).to.be.greaterThan(0);
            })
            .then(() => Promise.delay(25))
            .then(() => voterCWise.getRulesetsAsync(delegator))
            .then((rules: SetRules) => {
                expect(rules.rulesets).to.be.an("array").with.length(1);
                expect(rules.rulesets[0].name).to.be.equal("c");
                expect(rules.rulesets).to.deep.equal(rules4[rules4.length - 1].rules.rulesets);
            });
        });

        const rules5 = _.cloneDeep(rules4); // modify rules for voter c
        (rules5[rules5.length - 1].rules.rulesets[0].rules[1] as TagsRule).tags.push("sometag");
        it("Updates on modified tags array", () => {
            return Promise.delay(10)
            .then(() => delegatorWise.diffAndUpdateRulesAsync(rules5))
            .then((result: SteemOperationNumber | true) => {
                expect(result !== true, "rules were actually updated").to.be.true;
                expect((result as SteemOperationNumber).blockNum).to.be.greaterThan(0);
            })
            .then(() => Promise.delay(25))
            .then(() => voterCWise.getRulesetsAsync(delegator))
            .then((rules: SetRules) => {
                expect(rules.rulesets).to.be.an("array").with.length(1);
                expect(rules.rulesets[0].name).to.be.equal("c");
                expect(rules.rulesets).to.deep.equal(rules5[rules5.length - 1].rules.rulesets);
            });
        });

        /*it("lodash marks as equal same object deeply cloned", () => {
            const rules5cloned = _.cloneDeep(rules5);
            expect(_.isEqual(rules5, rules5cloned)).to.be.true;
        });*/

        const rules6 = _.cloneDeep(rules5);
        it("Does not update on same but deeply cloned rules", () => {
            return Promise.delay(10)
            .then(() => delegatorWise.diffAndUpdateRulesAsync(rules6))
            .then((result: SteemOperationNumber | true) => {
                expect(result === true, "rules were not updated").to.be.true;
            });
        });
    });
});
