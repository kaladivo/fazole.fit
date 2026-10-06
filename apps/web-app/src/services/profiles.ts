import { Profiles } from "@linky-fit/linkstr";
import type { Pubkey } from "@linky-fit/linkstr";
import { Effect } from "effect";
import { useEffect, useState } from "react";
import type { Nostr } from "./nostr";

/** What a kind-0 profile says about a person, e.g. an employee's Linky name and photo. */
export interface ProfileSummary {
  readonly name: string | null;
  readonly picture: string | null;
}

export interface ProfileLookup {
  /** The newest kind-0 profile, `null` when there is none or no relay answered. */
  readonly get: (pubkey: Pubkey) => Promise<ProfileSummary | null>;
}

const nonEmpty = (value: string | undefined) =>
  value === undefined || value.trim() === "" ? null : value.trim();

export const createProfileLookup = (nostr: Nostr): ProfileLookup => {
  const found = new Map<Pubkey, Promise<ProfileSummary | null>>();
  const fetchProfile = async (pubkey: Pubkey) => {
    try {
      const { profile } = await nostr.run(
        Effect.flatMap(Profiles, (profiles) => profiles.fetchProfile(pubkey)),
      );
      if (profile === null) {
        found.delete(pubkey);
        return null;
      }
      const { metadata } = profile;
      return {
        name: nonEmpty(metadata.displayName) ?? nonEmpty(metadata.name),
        picture: nonEmpty(metadata.picture),
      };
    } catch (error) {
      console.warn("profile not fetched", error);
      found.delete(pubkey);
      return null;
    }
  };
  return {
    get: (pubkey) => {
      const cached = found.get(pubkey);
      if (cached) return cached;
      const profile = fetchProfile(pubkey);
      found.set(pubkey, profile);
      return profile;
    },
  };
};

/** The profile of `pubkey` once fetched; `undefined` while it loads. */
export const useProfileOf = (
  lookup: ProfileLookup,
  pubkey: Pubkey | null,
): ProfileSummary | null | undefined => {
  const [profile, setProfile] = useState<{
    readonly pubkey: Pubkey;
    readonly value: ProfileSummary | null;
  } | null>(null);
  useEffect(() => {
    if (pubkey === null) return;
    let current = true;
    void lookup.get(pubkey).then((value) => {
      if (current) setProfile({ pubkey, value });
    });
    return () => {
      current = false;
    };
  }, [lookup, pubkey]);
  if (pubkey === null) return null;
  return profile?.pubkey === pubkey ? profile.value : undefined;
};
