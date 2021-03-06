/* tslint:disable:no-console */
import { createClaim, ClaimType } from '@po.et/poet-js'

import {
  AStudyInScarlet,
  PrivateKeyEAP,
  PrivateKeyACD,
  TheMurdersInTheRueMorgue,
  PrivateKeyMA,
  TheWeekOfDiana,
  KnowWhyTheCagedBirdSings,
  GatherTogetherInMyName,
  SinginAndSwinginAndGettingMerryLikeChristmas,
  TheHeartOfAWoman,
  AllGodsChildrenNeedTravelingShoes,
  ASongFlungUpToHeaven,
  MomAndMeAndMom,
  OnThePulseOfMorning,
  ABraveAndStartlingTrugh,
} from './Claims'

console.log(createClaim(PrivateKeyACD, ClaimType.Work, AStudyInScarlet.attributes))
console.log(createClaim(PrivateKeyEAP, ClaimType.Work, TheMurdersInTheRueMorgue.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, TheWeekOfDiana.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, KnowWhyTheCagedBirdSings.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, GatherTogetherInMyName.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, SinginAndSwinginAndGettingMerryLikeChristmas.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, TheHeartOfAWoman.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, AllGodsChildrenNeedTravelingShoes.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, ASongFlungUpToHeaven.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, MomAndMeAndMom.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, OnThePulseOfMorning.attributes))
console.log(createClaim(PrivateKeyMA, ClaimType.Work, ABraveAndStartlingTrugh.attributes))
