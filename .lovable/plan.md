# Plan - Fix Feed Authors and Avatars

Implement a stable, multi-tenant author and avatar resolution system for feed posts and comments with persistent storage.

## User Review Required

> [!IMPORTANT]
> The implementation involves changing the Row-Level Security (RLS) policy for `profiles` to allow members of the same tenant to see each other's basic information (name, avatar, company_id). This is necessary for the feed to display author names correctly.

## Proposed Changes

### Database & Security
- **RLS Policy for `profiles`**: Add a policy allowing authenticated users to `SELECT` (read) basic fields of other users in the same `company_id`.
- **Feed Comments Table**: Ensure `feed_post_comments` exists and is properly linked to `profiles.user_id`.

### Backend logic (Edge Functions / RPC)
- **Profile Resolution RPC**: (If RLS recursion occurs) Create a `SECURITY DEFINER` function `get_tenant_public_profiles` to fetch basic profile data safely.

### Frontend Components (`src/components/home/SocialFeed.tsx`)
- **Batch Profile Fetching**: Implement a logic to collect all `author_id`s from posts/comments and fetch their profiles in a single query (batching) to avoid N+1 issues.
- **Unified Avatar Display**: Use a centralized `UserAvatar` component that handles:
    - Signed URL resolution for private storage paths.
    - Initial-based fallback (e.g., "WS" for Wendel Silvério).
    - Error handling for broken images.
- **Persistent Comments**: Refactor the comment logic to save to and fetch from the `feed_post_comments` table instead of local state.
- **Realtime Integration**: Ensure the feed updates instantly when a new post or comment is added.

## Technical Details
- RLS Policy: `CREATE POLICY "Users can view basic profiles in same tenant" ON public.profiles FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));` (or optimized equivalent).
- Hook: Create `useFeedProfiles` to cache and provide profile data mapped by `user_id`.
- Type Safety: Update `FeedItem` and related interfaces to include stable author objects.
