/* tslint:disable:no-relative-imports */
import { Claim, isClaim, Work } from "@po.et/poet-js";
import {
  AsyncTest,
  Expect,
  SetupFixture,
  TestCase,
  TestFixture
} from "alsatian";

import { AStudyInScarlet, TheMurdersInTheRueMorgue, TheRaven } from "../Claims";
import { Client } from "./Helper";

@TestFixture("GET /works")
export class GetWorks {
  private client: Client;

  @SetupFixture
  public setupFixture() {
    this.client = new Client();
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldSucceed() {
    const response = await this.client.getWorks();

    Expect(response.status).toBe(200);
    Expect(response.ok).toBeTruthy();
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnAnArray() {
    const response = await this.client.getWorks();

    Expect(response.status).toBe(200);
    Expect(response.ok).toBeTruthy();

    const claims = await response.json();

    Expect(claims).toBeDefined();
    Expect(Array.isArray(claims)).toBeTruthy();
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnClaims() {
    const response = await this.client.getWorks();

    Expect(response.status).toBe(200);
    Expect(response.ok).toBeTruthy();

    const claims = await response.json();
    const allElementsAreClaims = !claims.find(
      (claim: Claim) => !isClaim(claim)
    );

    Expect(allElementsAreClaims).toBeTruthy();
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnExpectedFields(
    expectedClaims: ReadonlyArray<Work>
  ) {
    const response = await this.client.getWorks();

    Expect(response.status).toBe(200);
    Expect(response.ok).toBeTruthy();

    const json = await response.json();

    const claims: ReadonlyArray<Claim> = json.map((_: any) => ({
      ..._,
      dateCreated: new Date(_.dateCreated)
    }));

    for (let i = 0; i < claims.length; i++) {
      Expect(claims[i].id).toBe(expectedClaims[i].id);
      Expect(claims[i].publicKey).toBe(expectedClaims[i].publicKey);
      Expect(claims[i].signature).toBe(expectedClaims[i].signature);
      Expect(claims[i].dateCreated.toISOString()).toBe(
        expectedClaims[i].dateCreated.toISOString()
      );
    }
  }

  @AsyncTest()
  @TestCase("test")
  async getWorksShouldFailWith422WhenPassingAnInvalidArgument(test: string) {
    const response = await this.client.getWorksTest(test);

    Expect(response.status).toBe(422);
  }
}
