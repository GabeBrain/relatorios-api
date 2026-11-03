export class SpReadError extends Error {
  constructor(message:string,readonly code='contract'){super(message);this.name='SpReadError';}
}
/** Only controlled messages from our transport may reach the user, never raw provider bodies. */
export function spReadFailure(error:unknown,fallback:string):string {
  return error instanceof SpReadError?error.message:fallback;
}
