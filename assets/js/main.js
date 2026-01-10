/**
 * Bean Shop Site - Shared Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Bean Shop Site Loaded');

    // If we are on the home page, load random pickups
    const pickupContainer = document.getElementById('pickup-container');
    if (pickupContainer) {
        initRandomPickups(pickupContainer);
    }
});

/**
 * Fetches products.html, parses it, and displays random items
 */
async function initRandomPickups(container) {
    // Check if site is opened via file:// protocol
    if (window.location.protocol === 'file:') {
        console.error('Fetch is blocked on the file:// protocol. Please use a local server to view dynamic content.');
        container.innerHTML = `
            <p class="text-center" style="grid-column: 1 / -1; color: var(--text-muted); font-size: 0.9rem;">
                ローカルファイルとして閲覧中。動的コンテンツ（商品のランダム表示）を確認するには、VSCode の 「Live Server」 拡張機能などをご利用ください。
            </p>`;
        return;
    }

    try {
        const response = await fetch('products.html');
        if (!response.ok) throw new Error('Failed to load products');

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find all cards from products.html
        const allCards = Array.from(doc.querySelectorAll('.card'));

        if (allCards.length === 0) {
            container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">No products found.</p>';
            return;
        }

        // Shuffle and pick 3
        const shuffled = allCards.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        // Pre-process cards: fix image paths (if needed) and links
        // Since both index.html and products.html are in the root, paths should mostly work,
        // but product detail links go from product/ to product/.
        // Wait, index.html is in root. products.html is in root.
        // Detail links in products.html are like "product/tool-xxx.html".
        // This should work fine from index.html too.

        container.innerHTML = ''; // Clear loading message

        selected.forEach(card => {
            // Clone the card to index.html
            const clonedCard = card.cloneNode(true);

            // Note: The structure in index.html might slightly differ in desired style,
            // but for now we use the exact same card style for consistency.

            // Adjust the detail link in the card footer if it's different
            // Actually, in products.html they use "product/tool-xxx.html".
            // That works in index.html too.

            container.appendChild(clonedCard);
        });

    } catch (error) {
        console.error('Error loading pickups:', error);
        container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1; color: var(--text-muted);">Failed to load pickups.</p>';
    }
}
