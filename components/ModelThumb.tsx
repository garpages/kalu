"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { getCardImage } from "@/lib/thumbs";

// Photo area of a model card. Loads only when it scrolls near the screen.
export default function ModelThumb({
    path,
    alt,
    canCreate = false,
}: {
    path: string | null;
    alt: string;
    canCreate?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [src, setSrc] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || !path) return;

        if (typeof IntersectionObserver === "undefined") {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "300px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [path]);

    useEffect(() => {
        if (!visible || !path) return;

        let cancelled = false;
        getCardImage(path, canCreate).then((url) => {
            if (!cancelled) setSrc(url);
        });

        return () => {
            cancelled = true;
        };
    }, [visible, path, canCreate]);

    return (
        <div className="thumb" ref={ref}>
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    data-loaded={loaded}
                    onLoad={() => setLoaded(true)}
                />
            ) : (
                <div className="thumb-empty" aria-label={path ? "در حال بارگذاری" : "بدون عکس"}>
                    <Icon name="image" size={28} />
                </div>
            )}
        </div>
    );
}
