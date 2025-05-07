import fetch from 'node-fetch';
import Bookmark from '../models/bookmark.js';
import { validationResult } from 'express-validator';
import axios from 'axios';

// Helper to extract title and favicon
async function extractWebsiteInfo(url) {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Fetch the webpage content
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract title using regex (simplified approach)
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // Extract favicon
    let favicon = '';
    // Try common favicon locations
    const urlObj = new URL(url);
    favicon = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    
    // Try to find favicon in HTML
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    if (faviconMatch && faviconMatch[1]) {
      let faviconUrl = faviconMatch[1];
      // Handle relative URLs
      if (faviconUrl.startsWith('/')) {
        faviconUrl = `${urlObj.protocol}//${urlObj.hostname}${faviconUrl}`;
      } else if (!faviconUrl.startsWith('http')) {
        faviconUrl = `${urlObj.protocol}//${urlObj.hostname}/${faviconUrl}`;
      }
      favicon = faviconUrl;
    }

    return { title, favicon };
  } catch (error) {
    console.error('Error extracting website info:', error);
    return { title: url, favicon: '' };
  }
}

// Generate summary using Jina AI or fallback method
async function generateSummary(url, title) {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Get API key from environment variables
    const jinaApiKey = process.env.JINA_API_KEY;
    
    // Check if API key exists
    if (!jinaApiKey) {
      console.log('Missing Jina API key - using basic summary');
      return generateBasicSummary(url, title);
    }

    try {
      // Using new Jina AI r.jina.ai endpoint
      const response = await axios.post(
        'https://r.jina.ai/',
        {
          url: url
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jinaApiKey}`
          }
        }
      );

      if (response.data && response.data.summary) {
        // Limit summary length (max ~15-20 lines)
        return limitSummaryLength(response.data.summary.trim());
      } else if (response.data && typeof response.data === 'string') {
        // In case the API returns just the summary text directly
        return limitSummaryLength(response.data.trim());
      }
    } catch (apiError) {
      console.error('Jina API error:', apiError.message);
      // If API call fails, fall back to basic summary
      console.log('Falling back to basic summary generation');
    }
    
    // Fallback to basic summary if API call fails
    return generateBasicSummary(url, title);
  } catch (error) {
    console.error('Error in summary generation:', error);
    return `Bookmark saved: ${title || url}`;
  }
}

// Limit summary length to approximately 15-20 lines
function limitSummaryLength(summary) {
  const MAX_CHARS = 1000; // Approximately 15-20 lines
  
  if (summary.length <= MAX_CHARS) {
    return summary;
  }
  
  // Truncate to max chars and find the last period to make a clean cutoff
  let truncated = summary.substring(0, MAX_CHARS);
  const lastPeriod = truncated.lastIndexOf('.');
  
  // If we found a period in the truncated text, cut there for a cleaner end
  if (lastPeriod > MAX_CHARS * 0.7) { // Only use period if it's not too early in the text
    truncated = truncated.substring(0, lastPeriod + 1);
  } else {
    // Otherwise add ellipsis to indicate truncation
    truncated += '...';
  }
  
  return truncated;
}

// Generate a basic summary when the AI API is unavailable
function generateBasicSummary(url, title) {
  const domain = new URL(url).hostname;
  const cleanDomain = domain.replace('www.', '').split('.')[0];
  
  return `Bookmark from ${cleanDomain}: "${title || url}". Access this link to view the full content.`;
}

// Create a new bookmark
export async function createBookmark(req, res) {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url } = req.body;
    const userId = req.userId;

    // Extract website info
    const { title, favicon } = await extractWebsiteInfo(url);
    
    // Generate summary
    const summary = await generateSummary(url, title);
    
    // Save bookmark to database
    const bookmark = await Bookmark.create(userId, url, title, favicon, summary);
    
    res.status(201).json({
      message: 'Bookmark saved successfully',
      bookmark
    });
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({ message: 'Error saving bookmark' });
  }
}

// Get all bookmarks for current user
export async function getAllBookmarks(req, res) {
  try {
    const userId = req.userId;
    const bookmarks = await Bookmark.getAllByUserId(userId);
    
    res.json({ bookmarks });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ message: 'Error retrieving bookmarks' });
  }
}

// Delete a bookmark
export async function deleteBookmark(req, res) {
  try {
    const bookmarkId = req.params.id;
    const userId = req.userId;
    
    const result = await Bookmark.delete(bookmarkId, userId);
    
    if (!result.deleted) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }
    
    res.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({ message: 'Error deleting bookmark' });
  }
}
