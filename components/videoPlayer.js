import Player from "../lib/Artplayer";
import { useEffect, useState } from "react";
import { useAniList } from "../lib/useAnilist";

export default function VideoPlayer({
  data,
  id,
  progress,
  session,
  aniId,
  stats,
  op,
  ed,
  title,
  poster,
}) {
  const [url, setUrl] = useState();
  const [source, setSource] = useState([]);
  const [subtitle, setSubtitle] = useState();
  const [defSub, setDefSub] = useState();
  const { markProgress } = useAniList(session);

  useEffect(() => {
    async function compiler() {
      try {
        const dataEpi = data?.sources;
        const referer = data?.headers?.Referer;

        let sumber = dataEpi?.find(
          (source) =>
            source.quality === "default" ||
            source.quality === "1080p" ||
            source.quality === "720p" ||
            source.quality === "480p" ||
            source.quality === "360p" ||
            source.quality === "240p" ||
            source.quality === "144p"
        );

        const source = data.sources.map((items) => {
          const isDefault =
            items.quality === "default" || items.quality === "auto";
          return {
            ...(isDefault && { default: true }),
            html: items.quality === "default" ? "adaptive" : items.quality,
            url: `https://lerioproxy.herokuapp.com/${items.url}`,
          };
          // url: `https://cors.moopa.my.id/?url=${encodeURIComponent(items.url)}${
          //   referer ? `&referer=${encodeURIComponent(referer)}` : ""
          // }`,
        });

        const defUrl = `https://lerioproxy.herokuapp.com/${sumber.url}`;
        // const defUrl = `https://cors.moopa.my.id/?url=${encodeURIComponent(
        //   sumber.url
        // )}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;

        const subtitle = data?.subtitles
          .filter((subtitle) => subtitle.lang !== "Thumbnails")
          .map((subtitle) => {
            const isEnglish = subtitle.lang === "English";
            return {
              ...(isEnglish && { default: true }),
              url: subtitle.url,
              html: `${subtitle.lang}`,
            };
          });

        const defSub = data?.subtitles.filter((i) => i.lang === "English");
        setDefSub(defSub);

        // console.log(subtitle);
        setSubtitle(subtitle);

        setUrl(defUrl);
        setSource(source);
      } catch (error) {
        console.error(error);
      }
    }
    compiler();
  }, [data]);

  return (
    <>
      {url ? (
        <Player
          key={url}
          option={{
            url: `${url}`,
            title: `${title}`,
            // autoplay: true,
            subtitle: {
              url: defSub ? defSub[0].url : "",
              type: "vtt",
              encoding: "utf-8",
              name: "English",
              style: {
                color: "#FFFF",
              },
            },
            screenshot: true,
            poster: poster ? poster : "",
          }}
          quality={source}
          subtitles={subtitle}
          style={{
            width: "100%",
            height: "100%",
            margin: "0 auto 0",
          }}
          getInstance={(art) => {
            art.on("ready", () => {
              const seek = art.storage.get(id);
              const seekTime = seek?.time || 0;
              const duration = art.duration;
              const percentage = seekTime / duration;

              // if (defSub) {
              //   art.subtitle.url = defSub[0].url;
              //   art.subtitle.style({
              //     color: "white",
              //     // fontSize: "40px",
              //   });
              // }

              if (percentage >= 0.9) {
                // use >= instead of >
                art.currentTime = 0;
                console.log("Video started from the beginning");
              } else {
                art.currentTime = seekTime;
              }
            });

            art.on("video:timeupdate", () => {
              if (!session) return;
              const mediaSession = navigator.mediaSession;
              const currentTime = art.currentTime;
              const duration = art.duration;
              const percentage = currentTime / duration;

              mediaSession.setPositionState({
                duration: art.duration,
                playbackRate: art.playbackRate,
                position: art.currentTime,
              });

              // console.log(percentage);

              if (percentage >= 0.9) {
                // use >= instead of >
                markProgress(aniId, progress, stats);
                art.off("video:timeupdate");
                console.log("Video progress marked");
              }
            });

            art.on("video:timeupdate", function () {
              var currentTime = art.currentTime;

              if (
                op &&
                currentTime >= op.interval.startTime &&
                currentTime <= op.interval.endTime
              ) {
                // Add the layer if it's not already added
                if (!art.controls["op"]) {
                  // Remove the other control if it's already added
                  if (art.controls["ed"]) {
                    art.controls.remove("ed");
                  }

                  // Add the control
                  art.controls.add({
                    name: "op",
                    position: "top",
                    html: '<button class="skip-button">Skip Opening</button>',
                    click: function (...args) {
                      art.seek = op.interval.endTime;
                    },
                  });
                }
              } else if (
                ed &&
                currentTime >= ed.interval.startTime &&
                currentTime <= ed.interval.endTime
              ) {
                // Add the layer if it's not already added
                if (!art.controls["ed"]) {
                  // Remove the other control if it's already added
                  if (art.controls["op"]) {
                    art.controls.remove("op");
                  }

                  // Add the control
                  art.controls.add({
                    name: "ed",
                    position: "top",
                    html: '<button class="skip-button">Skip Ending</button>',
                    click: function (...args) {
                      art.seek = ed.interval.endTime;
                    },
                  });
                }
              } else {
                // Remove the controls if they're added
                if (art.controls["op"]) {
                  art.controls.remove("op");
                }
                if (art.controls["ed"]) {
                  art.controls.remove("ed");
                }
              }
            });

            art.on("destroy", async () => {
              art.storage.set(id, { time: art.currentTime });
            });
          }}
        />
      ) : (
        ""
      )}
    </>
  );
}
