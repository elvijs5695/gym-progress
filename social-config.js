import {APP_CONFIG} from './app-config.js';

export function validateAppConfig(config){
  if(!config?.supabaseUrl||!config?.publishableKey)throw new Error('The application connection is missing.');
  const url=new URL(String(config.supabaseUrl));
  if(url.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)
    throw new Error('Use the Supabase project HTTPS URL.');
  const projectRef=url.hostname.split('.')[0];
  if(config.projectRef!==projectRef)throw new Error('The project reference does not match the URL.');
  const key=String(config.publishableKey).trim();
  if(key.startsWith('sb_secret_'))throw new Error('Use a publishable key, never a secret key.');
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)){
    try{
      const encoded=key.split('.')[1];
      const payload=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
      if(payload.role!=='anon'||payload.ref&&payload.ref!==projectRef)throw new Error();
    }catch{throw new Error('Use the project’s Supabase publishable or anon key.');}
  }
  return {supabaseUrl:url.origin,publishableKey:key,projectRef};
}

// Production never adopts a connection left in localStorage by a test build.
const config=validateAppConfig(APP_CONFIG);
export const SUPABASE_URL=config.supabaseUrl;
export const SUPABASE_PUBLISHABLE_KEY=config.publishableKey;
export const SOCIAL_CONFIGURED=Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY);
