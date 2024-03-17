import { DeduplicateJoinsPlugin, ExpressionBuilder, Kysely, RawBuilder, SelectQueryBuilder, sql } from 'kysely';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import { DB } from 'src/db';
import { AssetFileType } from 'src/enum';
import { AssetSearchBuilderOptions } from 'src/interfaces/search.interface';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

/**
 * Allows optional values unlike the regular Between and uses MoreThanOrEqual
 * or LessThanOrEqual when only one parameter is specified.
 */
export function OptionalBetween<T>(from?: T, to?: T) {
  if (from && to) {
    return Between(from, to);
  } else if (from) {
    return MoreThanOrEqual(from);
  } else if (to) {
    return LessThanOrEqual(to);
  }
}

export const UPSERT_COLUMNS: Record<string, { [k: string]: RawBuilder<unknown> }> = {};

export const getUpsertColumns = async (tableName: string, pk: string, db: Kysely<DB>) => {
  if (!(tableName in UPSERT_COLUMNS)) {
    const tables = await db.introspection.getTables();
    const table = tables.find((table) => table.name === tableName)!;
    UPSERT_COLUMNS[tableName] = Object.fromEntries(
      table.columns
        .map((column) => column.name)
        .filter((column) => column !== pk)
        .map((column) => [column, sql`excluded.${sql.ref(column)}`]),
    );
  }

  return UPSERT_COLUMNS[tableName];
};

export const mapUpsertColumns = (columns: Record<string, any>, entry: Record<string, any>, pk: string) => {
  const upsertColumns: Record<string, any> = {};
  for (const column in entry) {
    if (column !== pk) {
      upsertColumns[column] = columns[column];
    }
  }

  return upsertColumns;
};

export const withExif = <O>(qb: SelectQueryBuilder<DB, 'assets', O>, options?: { inner: boolean }) => {
  const join = options?.inner
    ? qb.innerJoin('exif', 'assets.id', 'exif.assetId')
    : qb.leftJoin('exif', 'assets.id', 'exif.assetId');
  return join.select((eb) => eb.fn('jsonb_strip_nulls', [eb.fn('to_jsonb', [eb.table('exif')])]).as('exifInfo'));
};

export const withSmartSearch = <O>(qb: SelectQueryBuilder<DB, 'assets', O>, options?: { inner: boolean }) => {
  const join = options?.inner
    ? qb.innerJoin('smart_search', 'assets.id', 'smart_search.assetId')
    : qb.leftJoin('smart_search', 'assets.id', 'smart_search.assetId');
  return join.select(sql<number[]>`smart_search.embedding`.as('embedding'));
};

export const withFaces = (eb: ExpressionBuilder<DB, 'assets'>) =>
  jsonArrayFrom(eb.selectFrom('asset_faces').selectAll().whereRef('asset_faces.assetId', '=', 'assets.id')).as('faces');

export const withFiles = (eb: ExpressionBuilder<DB, 'assets'>, type?: AssetFileType) =>
  jsonArrayFrom(
    eb
      .selectFrom('asset_files')
      .selectAll()
      .whereRef('asset_files.assetId', '=', 'assets.id')
      .$if(!!type, (qb) => qb.where('type', '=', type!)),
  ).as('files');

export const withFacesAndPeople = (eb: ExpressionBuilder<DB, 'assets'>) =>
  eb
    .selectFrom('asset_faces')
    .leftJoin('person', 'person.id', 'asset_faces.personId')
    .whereRef('asset_faces.assetId', '=', 'assets.id')
    .select((eb) =>
      eb
        .fn('jsonb_agg', [
          eb
            .case()
            .when('person.id', 'is not', null)
            .then(
              eb.fn('jsonb_insert', [
                eb.fn('to_jsonb', [eb.table('asset_faces')]),
                sql`'{person}'::text[]`,
                eb.fn('to_jsonb', [eb.table('person')]),
              ]),
            )
            .else(eb.fn('to_jsonb', [eb.table('asset_faces')]))
            .end(),
        ])
        .as('faces'),
    )
    .as('faces');

/** Adds a `has_people` CTE that can be inner joined on to filter out assets */
export const hasPeopleCte = (db: Kysely<DB>, personIds: string[]) =>
  db.with('has_people', (qb) =>
    qb
      .selectFrom('asset_faces')
      .select('assetId')
      .where('personId', '=', anyUuid(personIds!))
      .groupBy('assetId')
      .having((eb) => eb.fn.count('personId'), '>=', personIds.length),
  );

export const hasPeople = (db: Kysely<DB>, personIds?: string[]) =>
  personIds && personIds.length > 0
    ? hasPeopleCte(db, personIds).selectFrom('assets').innerJoin('has_people', 'has_people.assetId', 'assets.id')
    : db.selectFrom('assets');

export const withOwner = (eb: ExpressionBuilder<DB, 'assets'>) =>
  jsonObjectFrom(eb.selectFrom('users').selectAll().whereRef('users.id', '=', 'assets.ownerId')).as('owner');

export const withLibrary = (eb: ExpressionBuilder<DB, 'assets'>) =>
  jsonObjectFrom(eb.selectFrom('libraries').selectAll().whereRef('libraries.id', '=', 'assets.libraryId')).as(
    'library',
  );

export const withStack = <O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  { assets, withDeleted }: { assets: boolean; withDeleted?: boolean },
) =>
  qb
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom('asset_stack')
          .selectAll('asset_stack')
          .whereRef('assets.stackId', '=', 'asset_stack.id')
          .$if(!!assets, (qb) =>
            qb
              .innerJoinLateral(
                (eb: ExpressionBuilder<DB, 'assets' | 'asset_stack'>) =>
                  eb
                    .selectFrom('assets as stacked')
                    .select((eb) => eb.fn('array_agg', [eb.table('stacked')]).as('assets'))
                    .whereRef('asset_stack.id', '=', 'stacked.stackId')
                    .whereRef('asset_stack.primaryAssetId', '!=', 'stacked.id')
                    .$if(!withDeleted, (qb) => qb.where('stacked.deletedAt', 'is', null))
                    .as('s'),
                (join) =>
                  join.on((eb) =>
                    eb.or([
                      eb('asset_stack.primaryAssetId', '=', eb.ref('assets.id')),
                      eb('assets.stackId', 'is', null),
                    ]),
                  ),
              )
              .select('s.assets'),
          )
          .as('stacked_assets'),
      (join) => join.onTrue(),
    )
    .select((eb) => eb.fn('jsonb_strip_nulls', [eb.fn('to_jsonb', [eb.table('stacked_assets')])]).as('stack'));

export const withAlbums = <O>(qb: SelectQueryBuilder<DB, 'assets', O>, { albumId }: { albumId?: string }) => {
  return qb
    .select((eb) =>
      jsonArrayFrom(
        eb
          .selectFrom('albums')
          .selectAll()
          .innerJoin('albums_assets_assets', (join) =>
            join
              .onRef('albums.id', '=', 'albums_assets_assets.albumsId')
              .onRef('assets.id', '=', 'albums_assets_assets.assetsId'),
          )
          .whereRef('albums.id', '=', 'albums_assets_assets.albumsId')
          .$if(!!albumId, (qb) => qb.where('albums.id', '=', asUuid(albumId!))),
      ).as('albums'),
    )
    .$if(!!albumId, (qb) =>
      qb.where((eb) =>
        eb.exists((eb) =>
          eb
            .selectFrom('albums_assets_assets')
            .whereRef('albums_assets_assets.assetsId', '=', 'assets.id')
            .where('albums_assets_assets.albumsId', '=', asUuid(albumId!)),
        ),
      ),
    );
};

export const asUuid = (id: string) => sql<string>`${id}::uuid`;

// export const anyUuid = (ids: string[]) => sql<string>`any(${ids}::uuid[])`;
export const anyUuid = (ids: string[]) => sql<string>`any(${`{${ids}}`}::uuid[])`;

export const asVector = (embedding: number[]) => sql<number[]>`${`[${embedding}]`}::vector`;

const joinDeduplicationPlugin = new DeduplicateJoinsPlugin();

export function searchAssetBuilder(kysely: Kysely<DB>, options: AssetSearchBuilderOptions) {
  options.isArchived ??= options.withArchived ? undefined : false;
  options.withDeleted ||= !!(options.trashedAfter || options.trashedBefore);
  return hasPeople(kysely.withPlugin(joinDeduplicationPlugin), options.personIds)
    .selectAll('assets')
    .$if(!!options.createdBefore, (qb) => qb.where('assets.createdAt', '<=', options.createdBefore!))
    .$if(!!options.createdAfter, (qb) => qb.where('assets.createdAt', '>=', options.createdAfter!))
    .$if(!!options.updatedBefore, (qb) => qb.where('assets.updatedAt', '<=', options.updatedBefore!))
    .$if(!!options.updatedAfter, (qb) => qb.where('assets.updatedAt', '>=', options.updatedAfter!))
    .$if(!!options.trashedBefore, (qb) => qb.where('assets.deletedAt', '<=', options.trashedBefore!))
    .$if(!!options.trashedAfter, (qb) => qb.where('assets.deletedAt', '>=', options.trashedAfter!))
    .$if(!!options.takenBefore, (qb) => qb.where('assets.fileCreatedAt', '<=', options.takenBefore!))
    .$if(!!options.takenAfter, (qb) => qb.where('assets.fileCreatedAt', '>=', options.takenAfter!))
    .$if(options.city !== undefined, (qb) =>
      qb
        .innerJoin('exif', 'assets.id', 'exif.assetId')
        .where('exif.city', options.city === null ? 'is' : '=', options.city!),
    )
    .$if(options.state !== undefined, (qb) =>
      qb
        .innerJoin('exif', 'assets.id', 'exif.assetId')
        .where('exif.state', options.state === null ? 'is' : '=', options.state!),
    )
    .$if(options.country !== undefined, (qb) =>
      qb
        .innerJoin('exif', 'assets.id', 'exif.assetId')
        .where('exif.country', options.country === null ? 'is' : '=', options.country!),
    )
    .$if(options.make !== undefined, (qb) =>
      qb
        .innerJoin('exif', 'assets.id', 'exif.assetId')
        .where('exif.make', options.make === null ? 'is' : '=', options.make!),
    )
    .$if(options.model !== undefined, (qb) =>
      qb
        .innerJoin('exif', 'assets.id', 'exif.assetId')
        .where('exif.model', options.model === null ? 'is' : '=', options.model!),
    )
    .$if(options.lensModel !== undefined, (qb) =>
      qb
        .innerJoin('exif', 'assets.id', 'exif.assetId')
        .where('exif.lensModel', options.lensModel === null ? 'is' : '=', options.lensModel!),
    )
    .$if(!!options.checksum, (qb) => qb.where('assets.checksum', '=', options.checksum!))
    .$if(!!options.deviceAssetId, (qb) => qb.where('assets.deviceAssetId', '=', options.deviceAssetId!))
    .$if(!!options.deviceId, (qb) => qb.where('assets.deviceId', '=', options.deviceId!))
    .$if(!!options.id, (qb) => qb.where('assets.id', '=', asUuid(options.id!)))
    .$if(!!options.libraryId, (qb) => qb.where('assets.libraryId', '=', asUuid(options.libraryId!)))
    .$if(!!options.userIds, (qb) => qb.where('assets.ownerId', '=', anyUuid(options.userIds!)))
    .$if(!!options.encodedVideoPath, (qb) => qb.where('assets.encodedVideoPath', '=', options.encodedVideoPath!))
    .$if(!!options.originalPath, (qb) => qb.where('assets.originalPath', '=', options.originalPath!))
    .$if(!!options.originalFileName, (qb) =>
      qb.where(sql`f_unaccent(assets."originalFileName")`, 'ilike', sql`f_unaccent(${options.originalFileName})`),
    )
    .$if(!!options.type, (qb) => qb.where('assets.type', '=', options.type!))
    .$if(options.isFavorite !== undefined, (qb) => qb.where('assets.isFavorite', '=', options.isFavorite!))
    .$if(options.isOffline !== undefined, (qb) => qb.where('assets.isOffline', '=', options.isOffline!))
    .$if(options.isVisible !== undefined, (qb) => qb.where('assets.isVisible', '=', options.isVisible!))
    .$if(options.isArchived !== undefined, (qb) => qb.where('assets.isArchived', '=', options.isArchived!))
    .$if(options.isEncoded !== undefined, (qb) =>
      qb.where('assets.encodedVideoPath', options.isEncoded ? 'is not' : 'is', null),
    )
    .$if(options.isMotion !== undefined, (qb) =>
      qb.where('assets.livePhotoVideoId', options.isMotion ? 'is not' : 'is', null),
    )
    .$if(!!options.isNotInAlbum, (qb) =>
      qb.where((eb) =>
        eb.not(eb.exists((eb) => eb.selectFrom('albums_assets_assets').whereRef('assetsId', '=', 'assets.id'))),
      ),
    )
    .$if(!!options.withExif, (qb) => withExif(qb, { inner: true }))
    .$if(!!(options.withFaces || options.withPeople || options.personIds), (qb) =>
      qb.select((eb) => withFacesAndPeople(eb)),
    )
    .$if(!options.withDeleted, (qb) => qb.where('assets.deletedAt', 'is', null));
}
