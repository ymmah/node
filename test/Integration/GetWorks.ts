/* tslint:disable:no-relative-imports */
import { Claim, isClaim } from '@po.et/poet-js'
import { AsyncTest, Expect, SetupFixture, TestCase, TestFixture } from 'alsatian'

import { Client } from './Helper'

@TestFixture('GET /works')
export class GetWorks {
  private client: Client

  @SetupFixture
  public setupFixture() {
    this.client = new Client()
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldSucceed() {
    const response = await this.client.getWorks()

    Expect(response.status).toBe(200)
    Expect(response.ok).toBeTruthy()
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnAnArray() {
    const response = await this.client.getWorks()

    Expect(response.status).toBe(200)
    Expect(response.ok).toBeTruthy()

    const claims = await response.json()

    Expect(claims).toBeDefined()
    Expect(Array.isArray(claims)).toBeTruthy()
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnClaims() {
    const response = await this.client.getWorks()

    Expect(response.status).toBe(200)
    Expect(response.ok).toBeTruthy()

    const claims = await response.json()
    const allElementsAreClaims = !claims.find((claim: Claim) => !isClaim(claim))

    Expect(allElementsAreClaims).toBeTruthy()
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnExpectedFields() {
    const response = await this.client.getWorks()

    Expect(response.status).toBe(200)
    Expect(response.ok).toBeTruthy()

    const json = await response.json()

    const claims: ReadonlyArray<Claim> = json.map((_: any) => ({
      ..._,
      dateCreated: new Date(_.dateCreated),
    }))

    for (const claim of claims) {
      Expect(claim.id).toBeTruthy()
      Expect(claim.publicKey).toBeTruthy()
      Expect(claim.signature).toBeTruthy()
      Expect(claim.dateCreated.toISOString()).toBeTruthy()
    }
  }

  @AsyncTest()
  @TestCase('test')
  async getWorksShouldFailWith422WhenPassingAnInvalidArgument(test: string) {
    const response = await this.client.getWorksTest(test)

    Expect(response.status).toBe(422)
  }
}
