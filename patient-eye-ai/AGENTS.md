<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Live vitals come from the client-side singleton in src/lib/simulator.ts exposed via src/hooks/use-simulator.tsx; DB holds only seed history — keeps the demo fast and offline-friendly.
- Patient visibility is enforced in RLS via has_role()/can_see_patient(); UI checks are cosmetic only.
- Demo accounts are created idempotently by the ensureDemoAccounts server function on the login page.
