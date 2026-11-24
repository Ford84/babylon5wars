import {applyVorchanStage} from './vorchan-stage-server.mjs';
import {MAP_PRESETS} from './battle-setup.mjs';
export function commitMovement({ship,privateState=ship.private_state,turn,action,advanceAfter=0,mapPreset='standard'}){
 if(!Number.isInteger(advanceAfter)||advanceAfter<0||advanceAfter>10000||advanceAfter&&['advance','slide','extended-cancel'].includes(action?.type))throw new RangeError('Invalid automatic movement segment');
 const args={ship,privateState,turn,action,mapBounds:MAP_PRESETS[mapPreset],allowExit:true};
 let result=applyVorchanStage(args);
 if(advanceAfter)result=applyVorchanStage({...args,ship:{...ship,...result.nextShip},privateState:result.nextPrivateState,action:{type:'advance',hexes:advanceAfter}});
 return result;
}
