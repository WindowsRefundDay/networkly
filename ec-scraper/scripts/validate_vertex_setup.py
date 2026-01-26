#!/usr/bin/env python3
"""Validate Vertex AI setup before running the scraper."""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

def check_env_vars():
    """Check if required environment variables are set."""
    print("🔍 Checking environment variables...")
    
    from src.config import get_settings
    settings = get_settings()
    
    if settings.use_vertex_ai:
        print("✅ USE_VERTEX_AI=true (Vertex AI mode)")
        
        if not settings.vertex_project_id or settings.vertex_project_id == "your-gcp-project-id":
            print("❌ VERTEX_PROJECT_ID not set or using placeholder")
            print("   Please set your GCP project ID in ec-scraper/.env")
            return False
        
        print(f"✅ VERTEX_PROJECT_ID={settings.vertex_project_id}")
        print(f"✅ VERTEX_LOCATION={settings.vertex_location}")
        
    else:
        print("⚠️  USE_VERTEX_AI=false (Gemini Developer API mode)")
        print("   This uses API keys and may hit quota limits.")
        print("   Recommended: Set USE_VERTEX_AI=true")
        
        if not settings.GOOGLE_API_KEY:
            print("❌ GOOGLE_API_KEY not set")
            return False
        
        print(f"✅ GOOGLE_API_KEY={'*' * 20}...{settings.GOOGLE_API_KEY[-8:]}")
    
    return True

def check_gcloud_auth():
    """Check if gcloud authentication is set up."""
    print("\n🔍 Checking Google Cloud authentication...")
    
    from src.config import get_settings
    settings = get_settings()
    
    if not settings.use_vertex_ai:
        print("⏭️  Skipping (not using Vertex AI)")
        return True
    
    # Check for service account credentials
    gcp_creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if gcp_creds_path:
        if os.path.exists(gcp_creds_path):
            print(f"✅ Service account credentials found at: {gcp_creds_path}")
            return True
        else:
            print(f"❌ GOOGLE_APPLICATION_CREDENTIALS set but file not found: {gcp_creds_path}")
            return False
    
    # Check for ADC
    adc_path = Path.home() / ".config" / "gcloud" / "application_default_credentials.json"
    if adc_path.exists():
        print(f"✅ Application Default Credentials found at: {adc_path}")
        print("   (Run 'gcloud auth application-default login' to refresh if needed)")
        return True
    
    print("❌ No credentials found")
    print("   Run: gcloud auth application-default login")
    print("   Or set GOOGLE_APPLICATION_CREDENTIALS to service account key path")
    return False

def test_client_init():
    """Test initializing the Gemini client."""
    print("\n🔍 Testing Gemini client initialization...")
    
    try:
        from src.llm.gemini_provider import GeminiProvider
        provider = GeminiProvider()
        print("✅ GeminiProvider initialized successfully")
        
        from src.embeddings.gemini import get_embeddings
        embeddings = get_embeddings()
        print("✅ GeminiEmbeddings initialized successfully")
        
        return True
        
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_api_call():
    """Test making an actual API call."""
    print("\n🔍 Testing Vertex AI API call...")
    
    try:
        from src.llm.gemini_provider import GeminiProvider, GenerationConfig
        
        provider = GeminiProvider()
        
        print("   Making test generation call...")
        response = await provider.generate(
            prompt="Say 'Hello from Vertex AI!' in exactly those words.",
            config=GenerationConfig(temperature=0.0, max_output_tokens=20),
        )
        
        print(f"✅ API call successful!")
        print(f"   Response: {response}")
        
        return True
        
    except Exception as e:
        error_str = str(e).lower()
        
        if "403" in error_str or "permission" in error_str:
            print("❌ Permission denied")
            print("   Your account may not have Vertex AI User role.")
            print("   Run: gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\")
            print("        --member='user:your-email@gmail.com' \\")
            print("        --role='roles/aiplatform.user'")
        
        elif "not found" in error_str or "404" in error_str:
            print("❌ Vertex AI API not enabled")
            print("   Run: gcloud services enable aiplatform.googleapis.com")
        
        elif "credentials" in error_str or "authentication" in error_str:
            print("❌ Authentication error")
            print("   Run: gcloud auth application-default login")
        
        else:
            print(f"❌ API call failed: {e}")
            import traceback
            traceback.print_exc()
        
        return False

async def test_embeddings():
    """Test embeddings generation."""
    print("\n🔍 Testing embeddings generation...")
    
    try:
        from src.embeddings.gemini import get_embeddings
        
        embeddings = get_embeddings()
        
        print("   Generating test embedding...")
        result = embeddings.generate_query_embedding("robotics competition for students")
        
        print(f"✅ Embeddings successful!")
        print(f"   Embedding dimension: {len(result)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Embeddings failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def print_summary(results):
    """Print summary of validation results."""
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    
    all_passed = all(results.values())
    
    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {check}")
    
    print("="*60)
    
    if all_passed:
        print("🎉 All checks passed! Your Vertex AI setup is ready.")
        print("\nNext steps:")
        print("  1. Run a dry run: python scripts/quick_discovery.py 'robotics' --dry-run")
        print("  2. Run a full discovery: python scripts/quick_discovery.py 'robotics'")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        print("\nSee VERTEX_AI_SETUP.md for detailed setup instructions.")
    
    return all_passed

async def main():
    """Run all validation checks."""
    print("=" * 60)
    print("VERTEX AI SETUP VALIDATION")
    print("=" * 60)
    
    results = {}
    
    # Check environment variables
    results["Environment Variables"] = check_env_vars()
    
    # Check authentication
    results["Authentication"] = check_gcloud_auth()
    
    # Check client initialization
    results["Client Initialization"] = test_client_init()
    
    # Only run API tests if previous checks passed
    if all(results.values()):
        results["API Call"] = await test_api_call()
        results["Embeddings"] = await test_embeddings()
    else:
        print("\n⏭️  Skipping API tests (fix configuration errors first)")
    
    # Print summary
    success = print_summary(results)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
