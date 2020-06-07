const glob = require("glob");
const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

var argv = require("minimist")(process.argv.slice(2));

if (argv["_"].length < 2) {
  process.stderr.write("Bad arguments\n");
  process.exit(1);
}
const folder = argv["_"][0];
const outputFile = argv["_"][1];

glob(folder + "/**/*.{m4a,mp3}", null, async (er, files) => {
  const albums = {};

  for (const [index, file] of files.entries()) {
    console.log(`Reading file ${index + 1} of ${files.length}`);

    const trackInfo = await getTrackInfo(file);
    if (trackInfo == null) continue;

    const album = albums[trackInfo.album.id] || {
      ...trackInfo.album,
      tracks: [],
    };

    albums[album.id] = {
      ...album,
      tracks: [...album.tracks, trackInfo.track],
    };

    // break;
  }

  for (const albumId of Object.keys(albums)) {
    const album = albums[albumId];

    album.trackCount = album.tracks.length;
    album.duration = album.tracks.reduce((acc, cur) => {
      acc = acc + cur.duration;
      return acc;
    }, 0);
  }

  fs.writeFile(outputFile, JSON.stringify(albums, null, 2), "utf8", () => {});
});

async function getTrackInfo(file) {
  try {
    const { stdout, stderr } = await exec(
      `ffprobe -i "${file}" -v quiet -print_format json -show_format -hide_banner`
    );

    const fileInfo = JSON.parse(stdout);

    if (fileInfo.format == null) {
      console.log(`**** no metadata found for file: ${file} ****`);
      return null;
    }

    const tags = fileInfo.format.tags;

    const artist = tags.album_artist != null ? tags.album_artist : tags.artist;
    const albumId = `${artist}/${tags.album}`;
    const trackId = `${artist}/${tags.album}/${tags.track}`;
    const year =
      tags.date != null ? parseInt(tags.date.substr(0, 4), 10) : null;

    // const folder = path.dirname(file);
    const artwork_file = path.dirname(file) + "/cover.jpg";
    const artwork = fs.existsSync(artwork_file)
      ? artwork_file.replace(folder, "")
      : "images/default-cover.jpg";

    // const artwork2 = [folder, "cover.jpg"]
    //   .map((x) => x.replace(/[:\"\?\/]/g, "_"))
    //   .join("/");

    const trackInfo = {
      album: {
        id: albumId,
        artist: artist,
        album: tags.album,
        year,
        artwork,
      },
      track: {
        id: trackId,
        file: file,
        artwork: artwork,
        track:
          tags.track != null ? parseInt(tags.track.split("/")[0], 10) : null,
        artist: artist,
        title: tags.title,
        year,
        duration: parseFloat(fileInfo.format.duration),
      },
    };
    return trackInfo;
  } catch (err) {
    console.error(err);
  }
}
