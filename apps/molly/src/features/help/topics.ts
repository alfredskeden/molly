// Short, in-app versions of docs/setup.md, reachable from error messages. Keep the two in step.

export type HelpTopic = 'reach' | 'key' | 'permissions';

export const HELP: Record<HelpTopic, { title: string; steps: string[] }> = {
  reach: {
    title: "Can't reach Baby Buddy",
    steps: [
      'Check the address: the one you open Baby Buddy at, e.g. https://baby.example.com, and that Baby Buddy is running.',
      "Plain http:// only works for addresses on your home network. Anything else needs https://.",
      "Web app only: Baby Buddy must allow Molly's address. Set CORS_ALLOWED_ORIGINS on Baby Buddy to Molly's exact address (scheme, host and port, no trailing slash) and restart it.",
      "Web app only: Molly's web server only lets the app call the Baby Buddy address in its BABY_BUDDY_ORIGIN setting. It must match exactly.",
      'Cloudflare Access: if Access protects Baby Buddy, add a bypass rule for its /api/* path. Otherwise Access answers with a login page instead of Baby Buddy.',
    ],
  },
  key: {
    title: 'Your API key',
    steps: [
      'In Baby Buddy, open your user menu and choose Settings (the /user/settings/ page).',
      'Copy the API key exactly. Both parents can share one user and key (simplest), or each use their own.',
      'Regenerating the key there makes the old one stop working on every device.',
    ],
  },
  permissions: {
    title: 'Permissions for each parent',
    steps: [
      "Simplest: both parents sign in with the same Baby Buddy admin user, or a user created on Baby Buddy's Users page without ticking Caregiver or Read only. Baby Buddy then gives it full access.",
      "Caregivers need extra permissions for Molly, granted in Baby Buddy's /admin/ → Users → the user → User permissions:",
      "babybuddy.view_settings (to sign in), core.delete_timer (to stop or cancel the other parent's timers), core.delete_sleep, core.delete_feeding, core.delete_diaperchange and core.delete_medication (to delete entries), core.change_tag and core.add_tag (to tag entries and skip naps; caregivers can already add and change the notes a skip saves).",
      'core.view_height, core.add_height, core.view_headcircumference, core.add_headcircumference, core.view_bmi and core.add_bmi (to see and log height, head circumference and BMI; caregivers can already log weight and temperature).',
    ],
  },
};
