import * as util from "util";

export class Plugin {
    constructor(data) {
        this.#data = Object.assign({}, data);
        this.#releaseAsDate = new Date(this.#data.release);
        this.#html = this.#dataToHtml();
    }

    /**
     * @typedef {Object} RawPluginData - Data as loaded from the JSON file
     * @property {string} title - The plugin title
     * @property {string} author - The author's name
     * @property {number} author_id - The author's forum ID
     * @property {number} topic_id - The forum topic ID
     * @property {string} desc - The plugin description
     * @property {string} type - The plugin type (e.g., "Effect", "Adjustment")
     * @property {string} release - The release date as a string
     * @property {string} status - The plugin status (e.g., "Active", "New")
     * @property {string} compatibility - The Paint.NET version compatibility
     * @property {string} dlls - Comma-separated list of DLL files
     * @property {string} menu - The menu location
     * @property {number} [alt_topic] - Optional alternative topic ID
     */
    #data;
    #releaseAsDate;
    #html;

    // a few of these have 0 references, but do get called through bracket notation. i.e. plugin['fieldName']
    get topicId() {
        return this.#data.topic_id;
    }

    get author() {
        return this.#data.author;
    }

    get desc() {
        return this.#data.desc;
    }

    get dlls() {
        return this.#data.dlls;
    }

    get html() {
        return this.#html;
    }

    get isActive() {
        return ["New", "Active", "Bundled"].some(x => util.equalsIgnoreCase(this.#data.status, x));
    }

    get isNew() {
        return util.equalsIgnoreCase(this.#data.status, "New");
    }

    get menu() {
        return this.#data.menu;
    }

    get release() {
        return this.#releaseAsDate;
    }

    get status() {
        return this.#data.status;
    }

    get title() {
        return this.#data.title;
    }

    get type() {
        return this.#data.type;
    }

    shouldDisplay(filters) {
        filters = Object.assign({
            keywords: "",
            keywordStyle: "any",
            status: "active",
            type: "any",
            author: "any",
            menu: "any",
        }, filters);

        if (filters.keywords) {
            const keywordStyle = filters.keywordStyle.toLowerCase();
            const upperKeywords = filters.keywords.toUpperCase();
            const searchableFields = ['title', 'desc', 'author', 'type', 'status', 'menu', 'dlls'];
            const searchTexts = searchableFields.map(field => String(this[field]).toUpperCase());

            if (keywordStyle === 'any' || keywordStyle === 'all') {
                const keywordArray = upperKeywords.split(/\s+/).filter(k => k.length > 0);
                if (keywordArray.length > 0) {
                    const matchFunc = keywordStyle === 'all' ? 'every' : 'some';
                    if (!keywordArray[matchFunc](keyword =>
                        searchTexts.some(text => text.includes(keyword))
                    )) {
                        return false;
                    }
                }
            } else if (keywordStyle === 'exact') {
                if (!searchTexts.some(text => text.includes(upperKeywords))) {
                    return false;
                }
            }
        }

        const filterStatus = filters.status.trim().toLowerCase();
        if (filterStatus === 'new') {
            if (!this.isNew) {
                return false;
            }
        } else if (filterStatus === 'active') {
            // Show if New, Active or Bundled
            if (!this.isActive) {
                return false;
            }
        } else if (filterStatus === 'inactive') {
            // Show if status is anything except New, Active or Bundled
            if (this.isActive) {
                return false;
            }
        }

        const filterType = filters.type.trim().toLowerCase();
        if (filterType !== 'any') {
            let hide = true;
            if (util.equalsIgnoreCase(this.type, "Effect") && filterType === 'effect' ||
                util.equalsIgnoreCase(this.type, "Adjustment") && filterType === 'adjustment' ||
                util.equalsIgnoreCase(this.type, "Filetype") && filterType === 'filetype' ||
                util.equalsIgnoreCase(this.type, "External Resource") && filterType === 'external' ||
                util.equalsIgnoreCase(this.type, "Plugin Pack") && filterType === 'plugin-pack') {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        if (filters.author && filters.author !== "any") {
            if (!util.equalsIgnoreCase(this.author, filters.author)) {
                return false;
            }
        }

        if (filters.menu && filters.menu !== "any") {
            if (!util.equalsIgnoreCase(this.menu, filters.menu)) {
                return false;
            }
        }

        return true;
    }

    validate() {
        const types = new Set(["effect", "adjustment", "filetype", "external resource", "plugin pack"]);
        const statuses = new Set(["active", "new", "deprecated", "obsolete", "incompatible", "unsupported", "integrated", "bundled"]);
        const is = {
            validNumber(value) {
                return typeof value === "number" && !isNaN(value) && value > 0;
            },
            validDate(value) {
                return value instanceof Date && !isNaN(value);
            },
            validType(value) {
                return typeof value === "string" && types.has(value.toLowerCase());
            },
            validStatus(value) {
                return typeof value === "string" && statuses.has(value.toLowerCase());
            },
            emptyString(value) {
                // Source: https://stackoverflow.com/a/36328062/2650847
                return typeof value === 'undefined' || !value ||
                    value.length === 0 || value === "" || !/[^\s]/.test(value) ||
                    /^\s*$/.test(value) || value.replace(/\s/g, "") === "";
            }
        };

        const issues = [];

        const logIssue = (data, value, reason) => {
            issues.push(`Plugin [topic_id=${data.topic_id} title=${data.title}]<br>Issue ${reason} [value=${value}]`);
            console.log(`${reason} [value=${value}] - ${JSON.stringify(data)}`);
        };

        const data = this.#data;

        if (!is.validDate(new Date(data.release))) {
            logIssue(data, data.release, "INVALID DATE");
        }
        if (!is.validNumber(data.topic_id)) {
            logIssue(data, data.topic_id, "INVALID TOPIC_ID");
        }
        if (!is.validNumber(data.author_id)) {
            logIssue(data, data.author_id, "INVALID AUTHOR ID");
        }
        if (data.alt_topic && !is.validNumber(data.alt_topic)) {
            logIssue(data, data.alt_topic, "INVALID ALT_TOPIC");
        }
        if (!is.validType(String(data.type))) {
            logIssue(data, data.type, "INVALID TYPE");
        }
        if (!is.validStatus(String(data.status))) {
            logIssue(data, data.status, "INVALID STATUS");
        }
        if (is.emptyString(String(data.title))) {
            logIssue(data, data.title, "EMPTY TITLE");
        }
        if (is.emptyString(String(data.author))) {
            logIssue(data, data.author, "EMPTY AUTHOR");
        }
        if (is.emptyString(String(data.desc))) {
            logIssue(data, data.author, "EMPTY DESC");
        }
        if (is.emptyString(String(data.compatibility))) {
            logIssue(data, data.compatibility, "EMPTY COMPAT");
        }
        if (is.emptyString(String(data.menu))) {
            logIssue(data, data.menu, "EMPTY MENU");
        }
        if (is.emptyString(String(data.dlls))) {
            logIssue(data, data.dlls, "EMPTY DLLS");
        }

        return issues;
    }

    static #timeSince(date) {
        const temporalSupported = (typeof Temporal === 'object' && 'PlainDate' in Temporal && 'Now' in Temporal && 'Duration' in Temporal);
        if (temporalSupported) {
            const asPlainDate = new Temporal.PlainDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
            const since = Temporal.Now.plainDateISO().since(asPlainDate, {largestUnit: "years", smallestUnit: "days"});

            return (since.years > 0 && since.months > 0)
                ? `Released ${since.years} year${since.years > 1 ? "s" : ""} ${since.months} month${since.months > 1 ? "s" : ""} ago` : (since.years > 0)
                    ? `Released ${since.years} year${since.years > 1 ? "s" : ""} ago` : (since.months > 0)
                        ? `Released ${since.months} month${since.months > 1 ? "s" : ""} ago` : (since.days > 0)
                            ? `Released ${since.days} day${since.days > 1 ? "s" : ""} ago`
                            : `Released today`;
        }

        let seconds = Math.floor((new Date() - date) / 1000);

        const intervals = [
            {label: "year", seconds: 31536000},
            {label: "month", seconds: 2592000},
            {label: "day", seconds: 86400},
            {label: "hour", seconds: 3600},
            {label: "minute", seconds: 60},
            {label: "second", seconds: 1}
        ];

        const years = Math.floor(seconds / intervals[0].seconds);
        seconds -= years * intervals[0].seconds;

        const months = Math.floor(seconds / intervals[1].seconds);

        if (years > 0) {
            let result = "Released " + years + " year" + (years > 1 ? "s" : "");
            if (months > 0) {
                result += " " + months + " month" + (months > 1 ? "s" : "");
            }
            return result + " ago";
        }

        // Fallback: normal largest unit logic
        for (let i = 1; i < intervals.length; i++) {
            const count = Math.floor(seconds / intervals[i].seconds);
            if (count >= 1) {
                return "Released " + count + " " + intervals[i].label + (count > 1 ? "s" : "") + " ago";
            }
        }

        return "just now";
    }

    #dataToHtml() {
        const data = this.#data;

        let altLink = '';
        if (data.hasOwnProperty('alt_topic') && data.alt_topic !== '') {
            altLink = `<sp class='alt'>See also: <a target="_blank" href="https://forums.getpaint.net/topic/${data.alt_topic}-alt-topic">
                                #${data.alt_topic}
                           </a></sp>`;
        }

        const dot = `<i class="bi bi-dot"></i>`;
        const since = Plugin.#timeSince(this.#releaseAsDate);
        const dlls = (data.dlls || "").split(",");
        const dllsHover = (data.dlls || "").replace(/, /g, "\n").trim() || "N/A"; // replace comma-space with newline for dll tooltip
        let dllText = `<sp class='dll-1'>${dlls[0] || 'N/A'}</sp>`;
        if (dlls.length > 1) {
            dllText = dllText + " <sp class='dll-2'>and " + (dlls.length - 1) + " more</sp>";
        }
        if (data.dlls.toLowerCase() === 'n/a') {
            dllText = data.dlls.trim();
        }
        return `<div class='plugin'>
                    <div class="phead">
                        <sp class='title'><a target="_blank" href="https://forums.getpaint.net/topic/${data.topic_id}-${util.slugify(data.title)}">
                            ${data.title}
                        </a></sp>
                    </div>
                    <sp class="desc">
${data.desc.substring(0, 450)}
<span class="ellipsis" id="ellipsis-${data.topic_id}">${data.desc.length > 450 ? '...' : ''}</span>
<sp ${data.desc.length > 450 ? '' : 'hidden'}>
    <sp id="more-${data.topic_id}" class="collapse">${data.desc.substring(450)}</sp>
    <br>
    <a data-bs-toggle="collapse" href="#more-${data.topic_id}" role="button" 
 
    onclick="this.textContent = this.textContent === 'Show more' ? 'Show less' : 'Show more';
                document.getElementById('ellipsis-${data.topic_id}').style.display = 
                this.textContent === 'Show more' ? '' : 'none';">Show more</a>
</sp>
                    </sp>
                    ${altLink}
                    <div class="tags">
                        <sp class="tag author">
                                <a target="_blank" href="https://forums.getpaint.net/profile/${data.author_id}-${util.slugify(data.author)}" title="View ${data.author}&apos;s profile">
                                    <i class="bi bi-person-circle"></i> ${data.author}
                                </a>
                            </sp>${dot}
                        <sp class="tag" title="Published on ${data.release}">${since}</sp>${dot}
                        <sp class="tag t" title="Plugin Type">${data.type}</sp>&nbsp;
                        <sp class="tag s" title="Plugin Status">${data.status}</sp>&nbsp;
                        <sp class="tag c" title="Released under PDN version&hellip;">${data.compatibility}</sp>&nbsp;
                        <sp class="tag m" title="Menu Location">${data.menu || 'N/A'}</sp>&nbsp;
                        <sp class="tag d" title="${dllsHover}">${dllText}</sp>
                    </div>
                </div>`.split("\n").map(s => s.trim()).join("\n");
    }
}