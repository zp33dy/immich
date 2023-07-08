import { AppRoute } from '$lib/constants';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, params }) => {
  const { user } = await parent();
  if (!user) {
    throw redirect(302, AppRoute.AUTH_LOGIN);
  }

  const { data: tag } = await locals.api.tagApi.getTagById({ id: params.tagId });
  const { data: assets } = await locals.api.tagApi.getTagAssets({ id: params.tagId });

  return {
    user,
    assets,
    tag,
    meta: {
      title: tag.name || 'Tag',
    },
  };
}) satisfies PageServerLoad;
