<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import EditNameInput from '$lib/components/faces-page/edit-name-input.svelte';
  import AddToAlbum from '$lib/components/photos-page/actions/add-to-album.svelte';
  import ArchiveAction from '$lib/components/photos-page/actions/archive-action.svelte';
  import CreateSharedLink from '$lib/components/photos-page/actions/create-shared-link.svelte';
  import DeleteAssets from '$lib/components/photos-page/actions/delete-assets.svelte';
  import DownloadAction from '$lib/components/photos-page/actions/download-action.svelte';
  import FavoriteAction from '$lib/components/photos-page/actions/favorite-action.svelte';
  import AssetSelectContextMenu from '$lib/components/photos-page/asset-select-context-menu.svelte';
  import AssetSelectControlBar from '$lib/components/photos-page/asset-select-control-bar.svelte';
  import ControlAppBar from '$lib/components/shared-components/control-app-bar.svelte';
  import GalleryViewer from '$lib/components/shared-components/gallery-viewer/gallery-viewer.svelte';
  import { AppRoute } from '$lib/constants';
  import { handleError } from '$lib/utils/handle-error';
  import { AssetResponseDto, TagResponseDto, api } from '@api';
  import ArrowLeft from 'svelte-material-icons/ArrowLeft.svelte';
  import DotsVertical from 'svelte-material-icons/DotsVertical.svelte';
  import Plus from 'svelte-material-icons/Plus.svelte';
  import type { PageData } from './$types';
  import CircleIconButton from '$lib/components/elements/buttons/circle-icon-button.svelte';
  import SelectAll from 'svelte-material-icons/SelectAll.svelte';
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import FaceThumbnailSelector from '$lib/components/faces-page/face-thumbnail-selector.svelte';
  import {
    NotificationType,
    notificationController,
  } from '$lib/components/shared-components/notification/notification';
  import TagOutline from 'svelte-material-icons/TagOutline.svelte';

  export let data: PageData;
  export let tag: TagResponseDto;

  let isSelectingFace = false;
  let previousRoute: string = AppRoute.EXPLORE;
  let selectedAssets: Set<AssetResponseDto> = new Set();
  $: isMultiSelectionMode = selectedAssets.size > 0;
  $: isAllArchive = Array.from(selectedAssets).every((asset) => asset.isArchived);
  $: isAllFavorite = Array.from(selectedAssets).every((asset) => asset.isFavorite);

  afterNavigate(({ from }) => {
    // Prevent setting previousRoute to the current page.
    if (from && from.route.id !== $page.route.id) {
      previousRoute = from.url.href;
    }
  });

  const onAssetDelete = (assetId: string) => {
    data.assets = data.assets.filter((asset: AssetResponseDto) => asset.id !== assetId);
  };
  const handleSelectAll = () => {
    selectedAssets = new Set(data.assets);
  };
</script>

{#if isMultiSelectionMode}
  <AssetSelectControlBar assets={selectedAssets} clearSelect={() => (selectedAssets = new Set())}>
    <CreateSharedLink />
    <CircleIconButton title="Select all" logo={SelectAll} on:click={handleSelectAll} />
    <AssetSelectContextMenu icon={Plus} title="Add">
      <AddToAlbum />
      <AddToAlbum shared />
    </AssetSelectContextMenu>
    <DeleteAssets {onAssetDelete} />
    <AssetSelectContextMenu icon={DotsVertical} title="Add">
      <DownloadAction menuItem filename="{data.tag.name || 'immich'}.zip" />
      <FavoriteAction menuItem removeFavorite={isAllFavorite} />
      <ArchiveAction menuItem unarchive={isAllArchive} onAssetArchive={(asset) => onAssetDelete(asset.id)} />
    </AssetSelectContextMenu>
  </AssetSelectControlBar>
{:else}
  <ControlAppBar showBackButton backIcon={ArrowLeft} on:close-button-click={() => goto(previousRoute)} />
{/if}

<!-- Tag information block -->
<section class="pt-24 px-4 sm:px-6 flex place-items-center">
  <div class="flex gap-4 py-2">
    <div>
      <TagOutline class="text-6xl text-immich-primary dark:text-immich-dark-primary w-[99%] border-b-2 border-transparent outline-none bg-immich-bg dark:bg-immich-dark-bg"/>
    </div>
    <div class="text-6xl text-immich-primary dark:text-immich-dark-primary w-[99%] border-b-2 border-transparent outline-none bg-immich-bg dark:bg-immich-dark-bg">
      {data.tag.name}
    </div>
  </div>
</section>

<!-- Gallery Block -->
{#if !isSelectingFace}
  <section class="relative pt-8 sm:px-4 mb-12 bg-immich-bg dark:bg-immich-dark-bg">
    <section class="overflow-y-auto relative immich-scrollbar">
      <section id="search-content" class="relative bg-immich-bg dark:bg-immich-dark-bg">
        <GalleryViewer assets={data.assets} viewFrom="search-page" showArchiveIcon={true} bind:selectedAssets />
      </section>
    </section>
  </section>
{/if}
