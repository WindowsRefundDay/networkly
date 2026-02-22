"""Curated high-quality sources for extracurricular opportunities.

These are verified, reliable websites that consistently publish
high school opportunities. Organized by category for targeted discovery.
"""

from typing import Dict, List

# Curated sources organized by opportunity type
CURATED_SOURCES: Dict[str, List[str]] = {
    "competitions": [
        # STEM Competitions
        "https://www.scienceolympiad.org/",
        "https://mathcounts.org/",
        "https://www.usaco.org/",  # USA Computing Olympiad
        "https://www.firstinspires.org/robotics/frc",
        "https://www.firstinspires.org/robotics/ftc",
        "https://www.collegeboard.org/",
        "https://www.mathleague.org/",
        "https://www.amc-math.org/",  # AMC/AIME
        "https://usamts.org/",  # USA Mathematical Talent Search
        "https://www.usnco.acs.org/",  # Chemistry Olympiad
        "https://www.aapt.org/physicsteam/",  # Physics Olympiad
        "https://usabo-trc.org/",  # Biology Olympiad
        "https://www.usaeo.org/",  # Earth Science Olympiad
        
        # Writing & Humanities
        "https://www.scholastic.com/artandwritingawards/",
        "https://nhseb.org/",  # National History Bowl
        "https://www.nhd.org/",  # National History Day
        "https://weareteachers.com/writing-contests-for-students/",
        
        # Debate & Speech
        "https://www.speechanddebate.org/",
        "https://www.tabroom.com/",
        
        # Business & Economics
        "https://www.deca.org/",
        "https://www.fbla.org/",
        "https://economicschallenge.org/",
        
        # General Academic
        "https://www.competitionsciences.org/",
        "https://www.nationalacademicleague.org/",
    ],
    
    "internships": [
        # Government & Research
        "https://www.nasa.gov/learning-resources/internship-programs/",
        "https://science.osti.gov/wdts/suli",  # DOE Science Undergrad Lab
        "https://www.nist.gov/careers/student-opportunities/",
        "https://orise.orau.gov/stem/internships-fellowships-research-opportunities/high-school.html",
        "https://www.nsf.gov/funding/pgm_summ.jsp?pims_id=6193",  # NSF REU
        
        # Tech Companies
        "https://careers.microsoft.com/students/",
        "https://www.google.com/edu/programs/",
        "https://www.ibm.com/academic/home",
        
        # Medical & Biology
        "https://www.nih.gov/research-training/training-opportunities",
        "https://www.nhlbi.nih.gov/grants-and-training/training-and-career-development/summer-institute",
        
        # General STEM
        "https://stemaway.com/",
        "https://www.pathwaystoscience.org/",
        "https://www.internships.com/high-school",
    ],
    
    "summer_programs": [
        # University Programs
        "https://www.jhu.edu/cty/",  # Johns Hopkins CTY
        "https://summerinstitutes.spcs.stanford.edu/",
        "https://mites.mit.edu/",  # MIT MITES
        "https://sse.si.edu/students",  # Smithsonian
        "https://www.bu.edu/summer/high-school-programs/",
        "https://precollege.columbia.edu/",
        "https://pton.edu/summer",
        "https://www.brown.edu/academics/college/summer/",
        "https://www.upenn.edu/summer/",
        "https://summer.harvard.edu/high-school-programs/",
        "https://www.yale.edu/summer-session",
        
        # STEM-Focused
        "https://www.aimforthestar.org/",  # Astronomy
        "https://www.cee.org/research-science-institute",  # RSI
        "https://www.mathcamp.org/",
        "https://www.promys.org/",
        "https://rossprogram.org/",
        "https://www.ssp.org/",  # Summer Science Program
        "https://www.garcia-research.org/",
        
        # Arts & Humanities
        "https://www.iowalakes.edu/community/creative-writers-workshop/",
        "https://www.goartsboston.org/summer",
        "https://www.csssa.ca.gov/",  # California State Summer School
    ],
    
    "scholarships": [
        "https://www.coca-colascholarsfoundation.org/",
        "https://www.dellscholars.org/",
        "https://www.questbridge.org/",
        "https://www.jackiekrobinsonscholarship.org/",
        "https://www.horatiooalger.org/scholarships/",
        "https://www.elks.org/scholars/",
        "https://www.ronbrown.org/",
        "https://gates.ms/",  # Gates Scholarship
        "https://www.posse.org/",
        "https://www.rotary.org/en/our-programs/scholarships",
    ],
    
    "research": [
        "https://www.regeneron.com/science-talent-search",
        "https://www.societyforscience.org/isef/",  # ISEF
        "https://www.jshs.org/",  # Junior Science & Humanities Symposium
        "https://www.societyforscience.org/regeneron-science-talent-search/",
        "https://www.societyforscience.org/junior-innovators-challenge/",
    ],
    
    "volunteering": [
        "https://www.volunteermatch.org/",
        "https://www.dosomething.org/",
        "https://www.redcross.org/volunteer/become-a-volunteer.html",
        "https://www.habitatforhumanity.org/volunteer/",
        "https://www.idealist.org/en/volunteer",
    ],
    
    "conferences": [
        "https://tasp.telluridassociation.org/",  # Telluride
        "https://www.leadamerica.org/",
        "https://www.hoby.org/",  # Hugh O'Brian Youth Leadership
        "https://www.nylf.org/",
    ],
}


def get_all_curated_urls() -> List[str]:
    """
    Get all curated URLs as a flat list.
    
    Returns:
        List of all curated source URLs
    """
    all_urls = []
    for category_urls in CURATED_SOURCES.values():
        all_urls.extend(category_urls)
    return list(set(all_urls))  # Remove duplicates


def get_curated_urls_by_category(category: str) -> List[str]:
    """
    Get curated URLs for a specific category.
    
    Args:
        category: Category name (e.g., "competitions", "internships")
        
    Returns:
        List of URLs for that category, or empty list if category not found
    """
    return CURATED_SOURCES.get(category, [])


def get_categories() -> List[str]:
    """
    Get all available categories.
    
    Returns:
        List of category names
    """
    return list(CURATED_SOURCES.keys())
