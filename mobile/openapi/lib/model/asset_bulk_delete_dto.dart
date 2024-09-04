//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class AssetBulkDeleteDto {
  /// Returns a new [AssetBulkDeleteDto] instance.
  AssetBulkDeleteDto({
    this.force,
    this.ids = const [],
    this.trashReason,
  });

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  bool? force;

  List<String> ids;

  AssetBulkDeleteDtoTrashReasonEnum? trashReason;

  @override
  bool operator ==(Object other) => identical(this, other) || other is AssetBulkDeleteDto &&
    other.force == force &&
    _deepEquality.equals(other.ids, ids) &&
    other.trashReason == trashReason;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (force == null ? 0 : force!.hashCode) +
    (ids.hashCode) +
    (trashReason == null ? 0 : trashReason!.hashCode);

  @override
  String toString() => 'AssetBulkDeleteDto[force=$force, ids=$ids, trashReason=$trashReason]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (this.force != null) {
      json[r'force'] = this.force;
    } else {
    //  json[r'force'] = null;
    }
      json[r'ids'] = this.ids;
    if (this.trashReason != null) {
      json[r'trashReason'] = this.trashReason;
    } else {
    //  json[r'trashReason'] = null;
    }
    return json;
  }

  /// Returns a new [AssetBulkDeleteDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static AssetBulkDeleteDto? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return AssetBulkDeleteDto(
        force: mapValueOfType<bool>(json, r'force'),
        ids: json[r'ids'] is Iterable
            ? (json[r'ids'] as Iterable).cast<String>().toList(growable: false)
            : const [],
        trashReason: AssetBulkDeleteDtoTrashReasonEnum.fromJson(json[r'trashReason']),
      );
    }
    return null;
  }

  static List<AssetBulkDeleteDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <AssetBulkDeleteDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = AssetBulkDeleteDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, AssetBulkDeleteDto> mapFromJson(dynamic json) {
    final map = <String, AssetBulkDeleteDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = AssetBulkDeleteDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of AssetBulkDeleteDto-objects as value to a dart map
  static Map<String, List<AssetBulkDeleteDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<AssetBulkDeleteDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = AssetBulkDeleteDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'ids',
  };
}


class AssetBulkDeleteDtoTrashReasonEnum {
  /// Instantiate a new enum with the provided [value].
  const AssetBulkDeleteDtoTrashReasonEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const user = AssetBulkDeleteDtoTrashReasonEnum._(r'user');
  static const offline = AssetBulkDeleteDtoTrashReasonEnum._(r'offline');

  /// List of all possible values in this [enum][AssetBulkDeleteDtoTrashReasonEnum].
  static const values = <AssetBulkDeleteDtoTrashReasonEnum>[
    user,
    offline,
  ];

  static AssetBulkDeleteDtoTrashReasonEnum? fromJson(dynamic value) => AssetBulkDeleteDtoTrashReasonEnumTypeTransformer().decode(value);

  static List<AssetBulkDeleteDtoTrashReasonEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <AssetBulkDeleteDtoTrashReasonEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = AssetBulkDeleteDtoTrashReasonEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [AssetBulkDeleteDtoTrashReasonEnum] to String,
/// and [decode] dynamic data back to [AssetBulkDeleteDtoTrashReasonEnum].
class AssetBulkDeleteDtoTrashReasonEnumTypeTransformer {
  factory AssetBulkDeleteDtoTrashReasonEnumTypeTransformer() => _instance ??= const AssetBulkDeleteDtoTrashReasonEnumTypeTransformer._();

  const AssetBulkDeleteDtoTrashReasonEnumTypeTransformer._();

  String encode(AssetBulkDeleteDtoTrashReasonEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a AssetBulkDeleteDtoTrashReasonEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  AssetBulkDeleteDtoTrashReasonEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'user': return AssetBulkDeleteDtoTrashReasonEnum.user;
        case r'offline': return AssetBulkDeleteDtoTrashReasonEnum.offline;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [AssetBulkDeleteDtoTrashReasonEnumTypeTransformer] instance.
  static AssetBulkDeleteDtoTrashReasonEnumTypeTransformer? _instance;
}


