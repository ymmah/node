/* tslint:disable:no-relative-imports */
import { Claim, isClaim } from '@po.et/poet-js'
import { AsyncTest, Expect, SetupFixture, TestCase, TestFixture } from 'alsatian'

import { claimFromJSON } from 'Helpers/Claim'

import { TheRaven, ABraveAndStartlingTrugh } from '../Claims'
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
  async getWorksShouldReturnAtLeast3() {
    const response = await this.client.getWorks()
    const claims = await response.json()
    const greaterThanThree = claims.length >= 3
    Expect(greaterThanThree).toBeTruthy()
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnOnly10() {
    const response = await this.client.getWorks()
    const claims = await response.json()
    const lessThan10 = claims.length <= 10
    Expect(lessThan10).toBeTruthy()
  }

  @AsyncTest()
  @TestCase('4')
  async getLimitedWorksShouldReturnLimit(limit: string) {
    const response = await this.client.getLimitedWorks(limit)
    const claims = await response.json()
    const lessThan4 = claims.length <= 4
    Expect(lessThan4).toBeTruthy()
  }

  @AsyncTest()
  @TestCase('5', ABraveAndStartlingTrugh.publicKey)
  async getOffsetAngelouWorksShouldReturn5(offset: string, publicKey: string) {
    const response = await this.client.getOffsetPublicKeyWorks(offset, publicKey)
    const claims = await response.json()
    const equalTo5 = (claims.length = 5)
    Expect(equalTo5).toBeTruthy()
  }

  @AsyncTest()
  @TestCase()
  async getWorksShouldReturnClaims() {
    const response = await this.client.getWorks()

    Expect(response.status).toBe(200)
    Expect(response.ok).toBeTruthy()

    const claims = await response.json()
    const allElementsAreClaims = !claims.find((claim: any) => !isClaim(claimFromJSON(claim)))

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

  @AsyncTest()
  @TestCase(TheRaven.publicKey)
  async getWorksShouldReturnMoreThanByPublicKey(publicKey?: string) {
    const response = await this.client.getWorks()
    const publicKeyResponse = await this.client.getWorksByPublicKey(publicKey)

    Expect(response.status).toBe(200)
    Expect(response.ok).toBeTruthy()
    Expect(publicKeyResponse.status).toBe(200)
    Expect(publicKeyResponse.ok).toBeTruthy()

    const claims = await response.json()
    const publicKeyClaims = await publicKeyResponse.json()
    const getWorksReturnsMore = claims.length > publicKeyClaims.length

    Expect(getWorksReturnsMore).toBeTruthy()
  }
}
