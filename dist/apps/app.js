import {createFirebaseClient} from '../firebase-client.js';
import {createDataClient} from '../data-client.js';

const $=id=>document.getElementById(id);
const validPublicHttps=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!u.hostname.endsWith('.localhost')&&!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.internal')&&!/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)?u.href:'';}catch{return '';}};
function status(text,error=false,success=false){const el=document.querySelector('#owner:not(.hidden) .status')||document.querySelector('#access .status');if(!el)return;el.textContent=text;el.dataset.error=String(error);el.dataset.success=String(success);}
async function main(){
 const configResponse=await fetch('/auth-config.json',{cache:'no-store'});if(!configResponse.ok)throw Error('Configuração de login indisponível.');const config=await configResponse.json();
 if(!config.enabled||!config.firebase)throw Error('O login ainda não está ativado neste ambiente.');
 const auth=await createFirebaseClient(config.firebase,config);const client=await createDataClient(()=>auth.token());
 if(!client)throw Error('A comunidade ainda não foi ativada neste ambiente.');
 $('open-studio').href='/studio';
 auth.observe(async user=>{if(!user){$('access').classList.remove('hidden');$('owner').classList.add('hidden');$('login').href='/studio';status('Entre pela página do KYROSHIX STUDIO e volte para este aplicativo.');return;}
   try{const allowed=await client.rpc('is_owner');if(!allowed)throw Error('Esta conta não tem permissão para publicar.');$('access').classList.add('hidden');$('owner').classList.remove('hidden');status(`Conectado como ${user.displayName||user.email||'proprietário'}.`,false,true);await refresh();}
   catch(error){$('access').classList.remove('hidden');$('owner').classList.add('hidden');status(error.message,true);}
 });
 async function refresh(){if($('music-list')){const rows=(await client.tracks()).filter(x=>/^https:\/\//i.test(x.audio_path));$('music-list').innerHTML=rows.map(x=>`<div class="item"><strong>${escapeHtml(x.title)}</strong><br>${escapeHtml(x.artists)}<br><span class="note">${escapeHtml(x.audio_path)}</span></div>`).join('')||'<p class="note">Nenhuma faixa por link publicada ainda.</p>';}
 if($('video-list')){const rows=await client.videos(true);$('video-list').innerHTML=rows.map(x=>`<div class="item"><strong>${escapeHtml(x.title)}</strong> · ${x.published?'Publicado':'Rascunho'}<br><span class="note">${escapeHtml(x.video_source.toUpperCase())} · ${escapeHtml(x.video_url)}</span></div>`).join('')||'<p class="note">Nenhum vídeo cadastrado ainda.</p>';}}
 const form=$('publisher');if(!form)return;
 form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button[type=submit]');button.disabled=true;status('Publicando…');try{
  if($('audio-url')){const url=validPublicHttps($('audio-url').value.trim());if(!url)throw Error('Use um link HTTPS público direto para o arquivo de áudio.');const item={id:crypto.randomUUID(),title:$('title').value.trim(),artists:$('artist').value.trim(),remix:$('remix').value.trim()||'Original',description:$('description').value,credits:$('credits').value,tags:['remix'],duration:0,audio_path:url,cover_path:'',legacy_cover:'',featured:false,byte_size:0};await client.rpc('save_track',{p_track:item});}
  else {const src=$('source').value,raw=$('video-url').value.trim(),url=src==='youtube'?youtubeId(raw):validPublicHttps(raw);if(!url)throw Error('Informe um link HTTPS válido compatível com a fonte escolhida.');const item={id:crypto.randomUUID(),title:$('title').value.trim(),artists:$('artist').value.trim(),description:$('description').value,credits:$('credits').value,video_source:src,video_url:url,cover_path:'',duration:Number($('duration').value)||0,chapters:[],caption_url:'',drm_system:'none',published:$('published').checked,byte_size:0};await client.rpc('save_video',{p_video:item});}
  form.reset();status('Conteúdo publicado com sucesso.',false,true);await refresh();
 }catch(error){status(error.message||'Não foi possível publicar. Revise os dados e tente novamente.',true);}finally{button.disabled=false;}});
 await refresh();
}
function youtubeId(value){try{const u=new URL(value);if(u.protocol!=='https:')return '';if(u.hostname==='youtu.be')return u.pathname.slice(1).match(/^[A-Za-z0-9_-]{11}$/)?.[0]||'';if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))return (u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/)?.[1]||'').match(/^[A-Za-z0-9_-]{11}$/)?.[0]||'';}catch{}return '';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
main().catch(error=>status(error.message||'Não foi possível iniciar o aplicativo.',true));
