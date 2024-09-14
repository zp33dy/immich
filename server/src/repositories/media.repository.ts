import { Inject, Injectable } from '@nestjs/common';
import { exiftool } from 'exiftool-vendored';
import ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import fs from 'node:fs/promises';
import { Writable } from 'node:stream';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { Colorspace } from 'src/config';
import { ILoggerRepository } from 'src/interfaces/logger.interface';
import {
  GenerateImageOptions,
  IMediaRepository,
  ImageDimensions,
  ImageOptions,
  TranscodeCommand,
  VideoInfo,
} from 'src/interfaces/media.interface';
import { Instrumentation } from 'src/utils/instrumentation';
import { handlePromiseError } from 'src/utils/misc';

const probe = promisify<string, FfprobeData>(ffmpeg.ffprobe);
sharp.concurrency(0);
sharp.cache({ files: 0 });

@Instrumentation()
@Injectable()
export class MediaRepository implements IMediaRepository {
  constructor(@Inject(ILoggerRepository) private logger: ILoggerRepository) {
    this.logger.setContext(MediaRepository.name);
  }

  async extract(input: string, output: string): Promise<boolean> {
    try {
      await exiftool.extractJpgFromRaw(input, output);
    } catch (error: any) {
      this.logger.debug('Could not extract JPEG from image, trying preview', error.message);
      try {
        await exiftool.extractPreview(input, output);
      } catch (error: any) {
        this.logger.debug('Could not extract preview from image', error.message);
        return false;
      }
    }

    return true;
  }

  async generateThumbnails(input: string | Buffer, options: GenerateImageOptions): Promise<void | Buffer> {
    const { colorspace, crop, preview, processInvalidImages, thumbhash, thumbnail } = options;
    // some invalid images can still be processed by sharp, but we want to fail on them by default to avoid crashes
    let pipeline = sharp(input, { failOn: processInvalidImages ? 'none' : 'error', limitInputPixels: false })
      .pipelineColorspace(colorspace === Colorspace.SRGB ? 'srgb' : 'rgb16')
      .withIccProfile(colorspace)
      .rotate();

    if (crop) {
      pipeline = pipeline.extract(crop);
    }

    const outputs = [];
    if (preview) {
      pipeline = pipeline.resize(preview.size, preview.size, {
        fit: 'outside',
        withoutEnlargement: true,
      });
      outputs.push(this.saveImageToFile(pipeline.clone(), preview));
    }

    if (thumbnail) {
      if (preview) {
        pipeline = pipeline
          .clone()
          .resize(thumbnail.size, thumbnail.size, { fit: 'outside', withoutEnlargement: true });
        outputs.push(this.saveImageToFile(pipeline, thumbnail));
      } else {
        pipeline = pipeline.resize(thumbnail.size, thumbnail.size, { fit: 'outside', withoutEnlargement: true });
        outputs.push(this.saveImageToFile(pipeline.clone(), thumbnail));
      }
    }

    if (thumbhash) {
      outputs.push(
        (preview || thumbnail ? pipeline.clone() : pipeline)
          .resize(100, 100, { fit: 'inside', withoutEnlargement: true })
          .raw()
          .ensureAlpha()
          .toBuffer({ resolveWithObject: true }),
      );
    }

    const results = await Promise.all(outputs);
    if (thumbhash) {
      const buffer = results.at(-1) as { data: Buffer; info: sharp.OutputInfo };
      const { rgbaToThumbHash } = await import('thumbhash');
      return Buffer.from(rgbaToThumbHash(buffer.info.width, buffer.info.height, buffer.data));
    }
  }

  private saveImageToFile(pipeline: sharp.Sharp, options: ImageOptions): Promise<sharp.OutputInfo> {
    return pipeline
      .toFormat(options.format, {
        quality: options.quality,
        // this is default in libvips (except the threshold is 90), but we need to set it manually in sharp
        chromaSubsampling: options.quality >= 80 ? '4:4:4' : '4:2:0',
      })
      .toFile(options.path);
  }

  async probe(input: string): Promise<VideoInfo> {
    const results = await probe(input);
    return {
      format: {
        formatName: results.format.format_name,
        formatLongName: results.format.format_long_name,
        duration: results.format.duration || 0,
        bitrate: results.format.bit_rate ?? 0,
      },
      videoStreams: results.streams
        .filter((stream) => stream.codec_type === 'video')
        .filter((stream) => !stream.disposition?.attached_pic)
        .map((stream) => ({
          index: stream.index,
          height: stream.height || 0,
          width: stream.width || 0,
          codecName: stream.codec_name === 'h265' ? 'hevc' : stream.codec_name,
          codecType: stream.codec_type,
          frameCount: Number.parseInt(stream.nb_frames ?? '0'),
          rotation: Number.parseInt(`${stream.rotation ?? 0}`),
          isHDR: stream.color_transfer === 'smpte2084' || stream.color_transfer === 'arib-std-b67',
          bitrate: Number.parseInt(stream.bit_rate ?? '0'),
        })),
      audioStreams: results.streams
        .filter((stream) => stream.codec_type === 'audio')
        .map((stream) => ({
          index: stream.index,
          codecType: stream.codec_type,
          codecName: stream.codec_name,
          frameCount: Number.parseInt(stream.nb_frames ?? '0'),
        })),
    };
  }

  transcode(input: string, output: string | Writable, options: TranscodeCommand): Promise<void> {
    if (!options.twoPass) {
      return new Promise((resolve, reject) => {
        this.configureFfmpegCall(input, output, options)
          .on('error', reject)
          .on('end', () => resolve())
          .run();
      });
    }

    if (typeof output !== 'string') {
      throw new TypeError('Two-pass transcoding does not support writing to a stream');
    }

    // two-pass allows for precise control of bitrate at the cost of running twice
    // recommended for vp9 for better quality and compression
    return new Promise((resolve, reject) => {
      // first pass output is not saved as only the .log file is needed
      this.configureFfmpegCall(input, '/dev/null', options)
        .addOptions('-pass', '1')
        .addOptions('-passlogfile', output)
        .addOptions('-f null')
        .on('error', reject)
        .on('end', () => {
          // second pass
          this.configureFfmpegCall(input, output, options)
            .addOptions('-pass', '2')
            .addOptions('-passlogfile', output)
            .on('error', reject)
            .on('end', () => handlePromiseError(fs.unlink(`${output}-0.log`), this.logger))
            .on('end', () => handlePromiseError(fs.rm(`${output}-0.log.mbtree`, { force: true }), this.logger))
            .on('end', () => resolve())
            .run();
        })
        .run();
    });
  }

  async getImageDimensions(input: string): Promise<ImageDimensions> {
    const { width = 0, height = 0 } = await sharp(input).metadata();
    return { width, height };
  }

  private configureFfmpegCall(input: string, output: string | Writable, options: TranscodeCommand) {
    return ffmpeg(input, { niceness: 10 })
      .inputOptions(options.inputOptions)
      .outputOptions(options.outputOptions)
      .output(output)
      .on('error', (error, stdout, stderr) => this.logger.error(stderr || error));
  }
}
