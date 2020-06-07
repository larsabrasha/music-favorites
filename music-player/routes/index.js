var express = require("express");
var router = express.Router();
const fs = require("fs");
const path = require("path");

var groupBy = (xs, key) => {
  return xs.reduce((prev, cur) => {
    (prev[cur[key]] = prev[cur[key]] || []).push(cur);
    return prev;
  }, {});
};

const albums = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../library.json"))
);

const albumsSortedByYearAndArtist = Object.keys(albums)
  .map((albumId) => albums[albumId])
  .sort(function (a, b) {
    const artistA = a.artist != null ? a.artist : "";
    const artistB = b.artist != null ? b.artist : "";

    return b.year - a.year || artistA.localeCompare(artistB);
  });

const albumsByYear = groupBy(albumsSortedByYearAndArtist, "year");

const albumsSortedByYear = Object.keys(albumsByYear)
  .map((year) => ({ year: year, albums: albumsByYear[year] }))
  .sort((a, b) => b.year - a.year);

console.log(albumsSortedByYear);

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", {
    albumsSortedByYear,
    helpers: {
      foo: function () {
        return "foo";
      },
    },
  });
});

module.exports = router;
