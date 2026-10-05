import React from 'react';
import AboutSection from './AboutSection';
import ExperienceSection from './ExperienceSection';
import ProjectsSection from './ProjectsSection';
import SkillsSection from './SkillsSection';
import AchievementsSection from './AchievementsSection';
import EducationSection from './EducationSection';
import CertificationsSection from './CertificationsSection';
import ContactSection from './ContactSection';
import CustomSection from './CustomSection';

// Maps DB section types to components
const SECTION_COMPONENTS = {
  about: AboutSection,
  experience: ExperienceSection,
  projects: ProjectsSection,
  skills: SkillsSection,
  achievements: AchievementsSection,
  education: EducationSection,
  certifications: CertificationsSection,
  contact: ContactSection,
};

export default function DynamicSectionRenderer({ sections, portfolioData }) {
  return (
    <>
      {sections.map((section) => {
        if (section.slug === 'hero') return null; // Hero rendered separately

        const Component = SECTION_COMPONENTS[section.type] || SECTION_COMPONENTS[section.slug];

        if (Component) {
          return <Component key={section.id} section={section} data={portfolioData} />;
        }

        // Fallback: render as custom section
        return <CustomSection key={section.id} section={section} data={portfolioData} />;
      })}
    </>
  );
}
