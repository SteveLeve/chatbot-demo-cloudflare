#!/usr/bin/env python3
"""
Wikipedia Dataset Fetcher
Fetches articles from wikimedia/wikipedia and converts them to the format required by the RAG system.

Usage:
    python scripts/fetch-wikipedia.py --size-mb 10
    python scripts/fetch-wikipedia.py --articles 2000
    python scripts/fetch-wikipedia.py --size-mb 10 --lang simple
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Iterator, Dict, Any

try:
    from datasets import load_dataset
except ImportError:
    print("Error: 'datasets' library not found.")
    print("Please install it with: pip install datasets")
    sys.exit(1)


def estimate_size(text: str) -> int:
    """Estimate size of text in bytes."""
    return len(text.encode('utf-8'))


def clean_article_title(title: str) -> str:
    """Clean article title to be filesystem-safe."""
    # Replace characters that aren't safe for filenames
    unsafe_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    cleaned = title
    for char in unsafe_chars:
        cleaned = cleaned.replace(char, '_')
    return cleaned


def convert_to_rag_format(article: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert wikimedia/wikipedia format to RAG system format.

    Input format (from dataset):
    {
        'id': '...',
        'url': '...',
        'title': '...',
        'text': '...'
    }

    Output format (for RAG system):
    {
        'title': '...',
        'content': '...',
        'metadata': {
            'categories': [],
            'url': '...',
            'id': '...'
        }
    }
    """
    return {
        'title': article['title'],
        'content': article['text'],
        'metadata': {
            'categories': [],  # Wikipedia simple doesn't have category info in this dataset
            'url': article.get('url', ''),
            'id': article.get('id', ''),
        }
    }


def fetch_wikipedia_dataset(
    output_dir: Path,
    size_mb: float = None,
    article_count: int = None,
    language: str = 'simple',
    split: str = 'train'
) -> Dict[str, Any]:
    """
    Fetch Wikipedia articles and save them as individual JSON files.

    Args:
        output_dir: Directory to save article JSON files
        size_mb: Target dataset size in megabytes (approximate)
        article_count: Target number of articles
        language: Wikipedia language edition (e.g., 'simple', 'en')
        split: Dataset split to use (default: 'train')

    Returns:
        Dictionary with statistics about the fetch operation
    """
    # Validate arguments
    if size_mb is None and article_count is None:
        raise ValueError("Must specify either --size-mb or --articles")

    if size_mb is not None and article_count is not None:
        raise ValueError("Cannot specify both --size-mb and --articles")

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load dataset in streaming mode to avoid memory issues
    print(f"Loading wikimedia/wikipedia ({language} edition) in streaming mode...")
    dataset_name = f'20231101.{language}'

    try:
        dataset = load_dataset(
            'wikimedia/wikipedia',
            dataset_name,
            split=split,
            streaming=True,
            trust_remote_code=True
        )
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print(f"Make sure the dataset '{dataset_name}' exists.")
        sys.exit(1)

    # Statistics
    total_size_bytes = 0
    articles_saved = 0
    articles_skipped = 0
    target_size_bytes = size_mb * 1024 * 1024 if size_mb else None

    print(f"\nFetching articles...")
    if size_mb:
        print(f"Target size: {size_mb:.1f} MB")
    else:
        print(f"Target articles: {article_count}")
    print(f"Output directory: {output_dir}")
    print("-" * 60)

    # Process articles
    for article in dataset:
        # Check if we've reached our target
        if size_mb and total_size_bytes >= target_size_bytes:
            break
        if article_count and articles_saved >= article_count:
            break

        # Skip articles with no text
        if not article.get('text') or len(article['text'].strip()) < 100:
            articles_skipped += 1
            continue

        # Skip very short articles (stubs)
        if len(article['text']) < 500:
            articles_skipped += 1
            continue

        # Convert to RAG format
        rag_article = convert_to_rag_format(article)

        # Generate filename
        safe_title = clean_article_title(article['title'])
        filename = f"{safe_title}.json"
        filepath = output_dir / filename

        # Avoid overwriting files (in case of duplicate titles)
        counter = 1
        while filepath.exists():
            filename = f"{safe_title}_{counter}.json"
            filepath = output_dir / filename
            counter += 1

        # Save article
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(rag_article, f, indent=2, ensure_ascii=False)

        # Update statistics
        article_size = estimate_size(article['text'])
        total_size_bytes += article_size
        articles_saved += 1

        # Progress update every 10 articles
        if articles_saved % 10 == 0:
            size_mb_current = total_size_bytes / (1024 * 1024)
            if size_mb:
                progress = (total_size_bytes / target_size_bytes) * 100
                print(f"Progress: {articles_saved} articles, {size_mb_current:.2f} MB ({progress:.1f}%)")
            else:
                progress = (articles_saved / article_count) * 100
                print(f"Progress: {articles_saved}/{article_count} articles ({progress:.1f}%), {size_mb_current:.2f} MB")

    # Final statistics
    final_size_mb = total_size_bytes / (1024 * 1024)
    avg_size_kb = (total_size_bytes / articles_saved / 1024) if articles_saved > 0 else 0

    stats = {
        'articles_saved': articles_saved,
        'articles_skipped': articles_skipped,
        'total_size_mb': final_size_mb,
        'average_article_size_kb': avg_size_kb,
        'output_directory': str(output_dir),
        'language': language,
    }

    print("-" * 60)
    print("\n=== Fetch Complete ===")
    print(f"Articles saved: {articles_saved}")
    print(f"Articles skipped: {articles_skipped} (too short or empty)")
    print(f"Total size: {final_size_mb:.2f} MB")
    print(f"Average article size: {avg_size_kb:.2f} KB")
    print(f"Files saved to: {output_dir}")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description='Fetch Wikipedia articles for RAG system',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fetch ~10MB of articles
  python scripts/fetch-wikipedia.py --size-mb 10

  # Fetch exactly 2000 articles
  python scripts/fetch-wikipedia.py --articles 2000

  # Fetch from English Wikipedia instead of Simple English
  python scripts/fetch-wikipedia.py --size-mb 10 --lang en

  # Save to a different directory
  python scripts/fetch-wikipedia.py --size-mb 10 --output custom/path
        """
    )

    # Mutually exclusive group for size specification
    size_group = parser.add_mutually_exclusive_group(required=True)
    size_group.add_argument(
        '--size-mb',
        type=float,
        help='Target dataset size in megabytes (approximate)'
    )
    size_group.add_argument(
        '--articles',
        type=int,
        help='Target number of articles to fetch'
    )

    parser.add_argument(
        '--lang',
        type=str,
        default='simple',
        choices=['simple', 'en'],
        help='Wikipedia language edition (default: simple)'
    )

    parser.add_argument(
        '--output',
        type=str,
        default='data/wikipedia',
        help='Output directory for article files (default: data/wikipedia)'
    )

    parser.add_argument(
        '--split',
        type=str,
        default='train',
        help='Dataset split to use (default: train)'
    )

    args = parser.parse_args()

    # Convert output path to Path object
    output_dir = Path(args.output)

    # Fetch dataset
    try:
        stats = fetch_wikipedia_dataset(
            output_dir=output_dir,
            size_mb=args.size_mb,
            article_count=args.articles,
            language=args.lang,
            split=args.split
        )

        # Save metadata
        metadata_file = output_dir / '_fetch_metadata.json'
        with open(metadata_file, 'w') as f:
            json.dump(stats, f, indent=2)

        print(f"\nMetadata saved to: {metadata_file}")
        print("\nNext steps:")
        print("1. Start your Worker: npm run dev")
        print("2. Ingest the articles: npm run ingest ./data/wikipedia")

    except KeyboardInterrupt:
        print("\n\nFetch interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
