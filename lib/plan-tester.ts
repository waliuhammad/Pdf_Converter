/**
 * Whether the plan tester's cookie may override the real plan.
 *
 * Development only, and only while its switcher is switched on
 * (NEXT_PUBLIC_SHOW_DEV_PLAN_SWITCHER=true). The switcher was hidden by
 * default, but a choice made with it earlier lives on in a year-long cookie —
 * and that invisible cookie kept replacing the plan set in the database, so
 * changing a user's plan appeared to do nothing, with no control left on
 * screen to clear it.
 */
export function planTesterEnabled(): boolean {
    return (
        process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_SHOW_DEV_PLAN_SWITCHER === "true"
    );
}
