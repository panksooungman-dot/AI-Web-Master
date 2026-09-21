import {
  FinalCTASection,
  HeroSection,
  LocalSection,
  LocationTeaserSection,
  OccasionTeaserSection,
  ReviewTeaserSection,
  SignatureStorySection,
  SpaceTeaserSection,
  TourSection,
} from "@/components/sections/HomeSections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SignatureStorySection />
      <SpaceTeaserSection />
      <OccasionTeaserSection />
      <LocalSection />
      <TourSection />
      <ReviewTeaserSection />
      <LocationTeaserSection />
      <FinalCTASection />
    </>
  );
}
