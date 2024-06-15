import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:immich_mobile/entities/android_device_asset.entity.dart';
import 'package:immich_mobile/entities/asset.entity.dart';
import 'package:immich_mobile/entities/ios_device_asset.entity.dart';
import 'package:immich_mobile/providers/db.provider.dart';
import 'package:immich_mobile/services/hash.service.dart';
import 'package:isar/isar.dart';
import 'package:photo_manager/photo_manager.dart';

final localAssetNotifierProvider =
    StateNotifierProvider<LocalAssetNotifier, bool>((ref) {
  return LocalAssetNotifier(ref.watch(localAssetServiceProvider));
});

class LocalAssetNotifier extends StateNotifier<bool> {
  LocalAssetNotifier(
    this._localAssetService,
  ) : super(true);

  final LocalAssetService _localAssetService;
  Future<void> getLocalAsset() async {
    await _localAssetService.getLocalAsset();
  }
}

class LocalAssetService {
  LocalAssetService(this._db, this._hashService);

  final Isar _db;
  final HashService _hashService;

  Future<void> getLocalAsset() async {
    final List<AssetPathEntity> localAlbums =
        await PhotoManager.getAssetPathList();

    for (final localAlbum in localAlbums) {
      final assetCount = await localAlbum.assetCountAsync;
      if (assetCount == 0) {
        continue;
      }

      final assets =
          await localAlbum.getAssetListRange(start: 0, end: assetCount);
      await _insertLocalAssetToDb(assets);
    }
  }

  Future<void> _insertLocalAssetToDb(List<AssetEntity> assets) async {
    for (final asset in assets) {
      final hashedAsset = await _hashService.hashAssets([asset]);
      if (hashedAsset.isNotEmpty) {
        final hashValue =
            await _db.iOSDeviceAssets.where().idEqualTo(asset.id).findFirst();

        await _db.writeTxn(() async {
          await _db.assets.put(Asset.local(asset, hashValue!.hash));
        });
      }
    }
  }
}

final localAssetServiceProvider = Provider<LocalAssetService>((ref) {
  final db = ref.watch(dbProvider);
  final hashService = ref.watch(hashServiceProvider);

  return LocalAssetService(db, hashService);
});
