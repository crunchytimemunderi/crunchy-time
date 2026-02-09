# Menu Item Images - Setup & Usage Guide

## Overview
Your menu items now support images! You can add image URLs to your menu items and they'll display in the sales page.

## Setup (One-Time)

### Step 1: Update Database
Run this SQL in your Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/pgpguzihsrfqkfbjwuee/sql/new
2. Copy and paste the contents of `ADD_MENU_IMAGES.sql`
3. Click "Run"

This adds an `image_url` column to your `menu_items` table.

### Step 2: Deploy to Vercel
The code changes have been automatically pushed to GitHub and will deploy to Vercel.

## How to Use

### Adding Images to Menu Items

**When Adding a New Item:**
1. Go to Sales page
2. Click "+ New" button
3. Fill in:
   - Item name (e.g., "Full Chicken")
   - Price (e.g., 150)
   - **Image URL** (e.g., https://example.com/chicken.jpg) - *Optional*
4. Click "✓ Add to Menu"

**When Editing Existing Items:**
1. Click the ✎ (edit) button on any menu item
2. Update the Image URL field
3. Click "✓ Update Item"

### Image URL Examples

You can use images from:
- **Google Drive**: Share the image publicly and use the direct link
- **Imgur**: Upload and use the direct link
- **Cloudinary**: Free image hosting
- **Any public URL**: Just make sure it's a direct image link (ends with .jpg, .png, .webp, etc.)

### Tips

- **Without Image**: If no image URL is provided, the 🍗 emoji will be shown (default)
- **With Image**: The image will display in a 64px high container, centered
- **Image Size**: Use images around 200-400px for best performance
- **Format**: JPG, PNG, or WebP formats work best
- **Public URLs**: Make sure the image URL is publicly accessible

## Testing

1. Add a new menu item with an image URL like: https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec
2. The image should appear in the menu grid
3. Click the item to add it to your cart
4. Edit the item to change the image URL

## Troubleshooting

**Image not showing?**
- Verify the URL is correct and publicly accessible
- Check that the URL ends with an image extension (.jpg, .png, etc.)
- Try opening the URL directly in your browser

**Default emoji showing instead?**
- Make sure you entered a valid URL in the Image URL field
- The URL must be a direct link to an image file

## Security Note

Only admin users can add/edit/delete menu items. The image URLs are stored as text in the database and displayed using standard HTML img tags.
