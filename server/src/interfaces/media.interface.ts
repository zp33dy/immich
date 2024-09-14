import { Writable } from 'node:stream';
import { ImageFormat, TranscodeTarget, VideoCodec } from 'src/config';

export const IMediaRepository = 'IMediaRepository';

export interface CropOptions {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ImageOptions {
  format: ImageFormat;
  path: string;
  quality: number;
  size: number;
}

export interface GenerateImageOptions {
  colorspace: string;
  crop?: CropOptions;
  preview?: ImageOptions;
  processInvalidImages: boolean;
  thumbhash?: boolean;
  thumbnail?: ImageOptions;
}

export interface VideoStreamInfo {
  index: number;
  height: number;
  width: number;
  rotation: number;
  codecName?: string;
  frameCount: number;
  isHDR: boolean;
  bitrate: number;
}

export interface AudioStreamInfo {
  index: number;
  codecName?: string;
  frameCount: number;
}

export interface VideoFormat {
  formatName?: string;
  formatLongName?: string;
  duration: number;
  bitrate: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface InputDimensions extends ImageDimensions {
  inputPath: string;
}

export interface VideoInfo {
  format: VideoFormat;
  videoStreams: VideoStreamInfo[];
  audioStreams: AudioStreamInfo[];
}

export interface TranscodeCommand {
  inputOptions: string[];
  outputOptions: string[];
  twoPass: boolean;
}

export interface BitrateDistribution {
  max: number;
  target: number;
  min: number;
  unit: string;
}

export interface VideoCodecSWConfig {
  getCommand(target: TranscodeTarget, videoStream: VideoStreamInfo, audioStream: AudioStreamInfo): TranscodeCommand;
}

export interface VideoCodecHWConfig extends VideoCodecSWConfig {
  getSupportedCodecs(): Array<VideoCodec>;
}

export interface IMediaRepository {
  // image
  extract(input: string, output: string): Promise<boolean>;
  generateThumbnails(input: string | Buffer, options: Partial<GenerateImageOptions>): Promise<void | Buffer>;
  getImageDimensions(input: string): Promise<ImageDimensions>;

  // video
  probe(input: string): Promise<VideoInfo>;
  transcode(input: string, output: string | Writable, command: TranscodeCommand): Promise<void>;
}
