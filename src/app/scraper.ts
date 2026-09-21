/**
 * @file app/scrapper.ts
 * @author RodrigoDornelles
 */
import * as HTML from "../thirdy-party/findstr_htmldom"
import { base_url } from "./http";

type Cart = {
    cart: string,
    title: string;
    description: string;
    author: string;
    image: string;
};

type CartInfos = {
    title: string;
    author: string;
    description: string;
    download: string;
    image: string;
};

const CARD_AUTHOR_PREFIX = "by ";
const PAGE_AUTHOR_PREFIX = "made by ";
const CART_PATH_PREFIX = "/cart/";
const CART_FILE_SUFFIX = ".tic";

function absolute(path?: string | boolean): string {
    return typeof path === "string" ? `${base_url}${path}` : "";
}

function textOf(node?: HTML.HTMLNode): string {
    return node ? node.text().trim() : "";
}

function unprefix(value: string, prefix: string): string {
    return value.startsWith(prefix) ? value.substring(prefix.length).trim() : value;
}

/**
 * @c select walks the whole subtree, this keeps only the direct childs.
 */
function children(node: HTML.HTMLNode, name: string): HTML.HTMLNode[] {
    const nodes: HTML.HTMLNode[] = [];

    for (const child of node.child) {
        if (typeof child !== "string" && child.name === name) {
            nodes.push(child);
        }
    }

    return nodes;
}

export function extractCarts(html: string): Cart[] {
    const [root, err] = HTML.parse(html);
    if (!root) {
        throw new Error(err);
    }

    const carts = root.select(".cart");
    const results: Cart[] = [];

    for (const cart of carts) {
        const title = textOf(cart.select("h2")[0]);

        const texts = cart.select(".text-muted");
        const description = textOf(texts[0]);
        const author = unprefix(textOf(texts[1]), CARD_AUTHOR_PREFIX);

        const cover = cart.select(".cover-card")[0];
        const image = absolute(cover?.select("img")[0]?.attr?.src);

        const link = cover?.select("a")[0];
        const id = `${link?.attr?.href ?? ''}`;

        results.push({
            cart: id,
            title,
            description,
            author,
            image,
        });
    }

    return results;
}

export function extractCartInfos(html: string): CartInfos {
    const [root, err] = HTML.parse(html);
    if (!root) throw new Error(err);

    const main = root.select("main")[0];
    if (!main) throw new Error("cartridge page without a <main>");

    /** the header is the first block, everything before the comments */
    const header = children(main, "div")[0] ?? main;
    const infos = children(header, "div");

    /** @c h1 is a breadcrumb, the title is the last crumb */
    const title = `${textOf(header.select("h1")[0]).split(">").pop()}`.trim();

    const authorInfo = infos.find(info => textOf(info).startsWith(PAGE_AUTHOR_PREFIX));
    const author = unprefix(textOf(authorInfo), PAGE_AUTHOR_PREFIX);

    const downloadLink = header.select("a").find(link => {
        const href = link.attr?.href;
        return typeof href === "string"
            && href.startsWith(CART_PATH_PREFIX)
            && href.endsWith(CART_FILE_SUFFIX);
    });
    const download = absolute(downloadLink?.attr?.href);

    const image = absolute(header.select(".game-cover-img")[0]?.select("img")[0]?.attr?.src);

    /** the long text lives beside the header, the short one is the first info */
    const summary = infos[0] === authorInfo ? "" : textOf(infos[0]);
    const description = textOf(children(main, "p")[0]) || summary;

    return {
        title, description, author, download, image
    }
}
