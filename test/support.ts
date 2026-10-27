// What the 5e's tests share: a campaign that plays this repository's 5e, made by the engine's test kit, never with the engine's own files (D-506, D-514).
import { fileURLToPath } from "node:url";
import { type Context, type TestCampaign, testCampaign, type TestCampaignOptions } from "rpg-engine/testing";

/** This repository's folder, the 5e's own: it wins by name over the copy the engine still ships. */
export const repository = fileURLToPath(new URL("..", import.meta.url));

/** A campaign in play on this repository's 5e, in English unless told otherwise, with the extensions and settings given. */
export function fifthEdition(options: Omit<TestCampaignOptions, "system" | "systems"> = {}): Promise<TestCampaign>
{
    return testCampaign({ system: "5e", systems: [repository], ...options });
}

/** What a call to a campaign gives, with part of its context changed for that call alone: a page or a player that answers, dice that show one face. */
export async function withContext<Given>(campaign: TestCampaign, given: Partial<Context>, call: () => Promise<Given>): Promise<Given>
{
    const context = campaign.context;
    campaign.context = { ...context, ...given };

    try {
        return await call();
    } finally {
        campaign.context = context;
    }
}
