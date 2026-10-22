import assert from 'node:assert/strict';
import {createFirebaseClient} from '../dist/firebase-client.js';
import {format,filterTracks} from '../dist/ui-utils.js';
import {youtubeId,readHistory} from '../dist/video-player.js';

assert.equal(format(Infinity),'0:00');
assert.equal(format(NaN),'0:00');
assert.equal(format(-5),'0:00');
assert.equal(format(93.7),'1:33');
assert.deepEqual(filterTracks([{id:'1',title:'Sem etiquetas',tags:null,artists:'',remix:''}],{filter:'anime'}),[]);
assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'),'dQw4w9WgXcQ');
assert.equal(youtubeId('https://evil.example/watch?v=dQw4w9WgXcQ'),'');
globalThis.localStorage={getItem:()=> 'null'};
assert.deepEqual(readHistory(),{});
globalThis.localStorage={getItem:()=> '[]'};
assert.deepEqual(readHistory(),{});
globalThis.location=new URL('https://preview.example.test/inicio');
const user={uid:'test-user',email:'user@example.test'};
const auth={currentUser:user};
const sdk={
  getAuth:()=>auth,
  setPersistence:async()=>{},
  browserLocalPersistence:'local',
  createUserWithEmailAndPassword:async()=>({user}),
  updateProfile:async()=>{},
  sendEmailVerification:async()=>{const error=new Error('Domain not authorized');error.code='auth/unauthorized-continue-uri';throw error;},
  onAuthStateChanged:(_auth,cb)=>{cb(user);return()=>{};}
};
const client=await createFirebaseClient({projectId:'demo'}, {providers:['google.com'],security:{requireEmailCode:false}}, {loadSdk:async()=>[{initializeApp: config=>config},sdk]});
const result=await client.signup('user@example.test','verylongpassword','User');
assert.equal(result.user,user);
assert.equal(result.verificationSent,false);
assert.equal(result.verificationErrorCode,'auth/unauthorized-continue-uri');
assert.equal(result.profileSaved,true);
assert.deepEqual(client.providers,['google.com']);
console.log('PASS: auth signup verification diagnostics, invalid watch history, metadata display and YouTube URL validation.');
