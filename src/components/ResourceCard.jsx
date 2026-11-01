import Icon from "./Icon";
import { tagTone } from "../constants";
import { displayName } from "../utils";

/**
 * One resource in a grid. The whole card opens the resource (the title button stretches over it);
 * the bookmark star sits on top so it can be tapped on its own.
 */
export default function ResourceCard({ resource: r, bookmarked, onOpen, onToggleBookmark }) {
  return (
    <article className="card">
      <div className="card__top">
        {r.type ? <span className={`tag tag--${tagTone(r.type)}`}>{r.type}</span> : <span />}
        <button
          type="button"
          className="bookmark"
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `Remove ${r.title} from your library` : `Add ${r.title} to your library`}
          onClick={() => onToggleBookmark(r.id)}
        >
          <Icon name="star" size={22} filled={bookmarked} />
        </button>
      </div>
      <h3 className="card__title">
        <button type="button" className="card__open" onClick={() => onOpen(r)}>
          {r.title}
        </button>
      </h3>
      <p className="card__desc">{r.description || "No description."}</p>
      <div className="card__meta">
        {r.subject && <span>{r.subject}</span>}
        {r.grade && <span>{r.grade}</span>}
      </div>
      <div className="card__foot">
        <span>by {displayName(r.author)}</span>
        {r.file_url && (
          <span className="card__file">
            <Icon name="paperclip" size={14} />
            File attached
          </span>
        )}
      </div>
    </article>
  );
}
