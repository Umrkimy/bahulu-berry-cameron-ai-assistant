"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { homeCopy, social } from "../_lib/content";
import type { TikTokVideo } from "../_lib/tiktok";
import { useLocale } from "./locale-provider";
import { Reveal, Stagger, StaggerItem } from "./motion";
import { SocialIcon } from "./social-icons";

export function TikTokSection({ videos }: { videos: TikTokVideo[] }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const [playing, setPlaying] = useState<string | null>(null);
  if (videos.length === 0) return null;

  return <section className="home-videos" aria-labelledby="videos-title">
    <div className="shell">
      <Reveal className="home-section-heading">
        <div><h2 id="videos-title">{text.videosTitle}</h2><p className="section-intro">{text.videosIntro}</p></div>
        <a className="home-text-link" href={social.tiktokUrl} target="_blank" rel="noreferrer">{text.follow}<span aria-hidden="true">↗</span></a>
      </Reveal>
      <Stagger as="ul" className="video-row">
        {videos.map((video) => <StaggerItem as="li" key={video.id} className="video-card">
          {playing === video.id
            ? <iframe title={video.caption || text.videosTitle} src={`https://www.tiktok.com/player/v1/${video.id}?autoplay=1&rel=0&description=0&music_info=0`} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            : <button type="button" className="video-poster" onClick={() => setPlaying(video.id)} aria-label={`${text.play}: ${video.caption}`}>
              <PosterImage id={video.id} poster={video.poster} />
              <span className="video-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg></span>
              {video.caption ? <span className="video-caption">{video.caption}</span> : null}
            </button>}
        </StaggerItem>)}
      </Stagger>
      <p className="videos-note">{text.videosNote}</p>
    </div>
  </section>;
}

function PosterImage({ id, poster }: { id: string; poster?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <span className="video-fallback" aria-hidden="true">
    <Image src="/concept/brand-preview.webp" alt="" width={240} height={240} />
    <span className="video-fallback-tag"><SocialIcon name="tiktok" />TikTok</span>
  </span>;
  // eslint-disable-next-line @next/next/no-img-element -- local cover or same-origin proxy, sized by CSS
  return <img ref={ref} src={poster ?? `/storefront-data/tiktok/${id}`} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
