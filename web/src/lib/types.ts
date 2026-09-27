// The shapes our API returns (see api/src/services/*: toAccountView, toKeyView).
export type Features = { face: boolean; voice: boolean; voiceCloning: boolean };

export type AccountView = {
  id: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'blocked';
  statusReason: string | null;
  staffRole: 'support' | 'admin' | 'owner' | null;
  hasLinkedDevice: boolean;
  createdAt: string;
};

export type KeyView = {
  id: string;
  masked: string;
  last4: string;
  status: 'issued' | 'active' | 'exhausted' | 'expired' | 'revoked';
  source: 'new_account' | 'donation' | 'admin_grant';
  goLivesTotal: number;
  goLivesUsed: number;
  goLivesLeft: number;
  minutesPerGoLive: number;
  features: Features;
  issuedAt: string;
  activatedAt: string | null;
  expiresAt: string;
  revealable: boolean;
  linkedToDevice: boolean;
};

export type FreeKeyOffer = { goLives: number; minutesPerGoLive: number; expiryDays: number; features: Features };

export type KeyState = {
  key: KeyView | null;
  hasCurrentKey: boolean;
  canGetFreeKey: boolean;
  canDonate: boolean;
  freeKeyOffer: FreeKeyOffer | null;
};
