import {
  OverviewIcon,
  RiskMapIcon,
  ProjectsIcon,
  VendorsIcon,
  MPsIcon,
  DuplicatesIcon,
  ExploreIcon
} from './icons'

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true, Icon: OverviewIcon },
  { to: '/risk-map', label: 'Risk Map', Icon: RiskMapIcon },
  { to: '/projects', label: 'Projects', Icon: ProjectsIcon },
  { to: '/vendors', label: 'Vendors', Icon: VendorsIcon },
  { to: '/mps', label: 'MPs', Icon: MPsIcon },
  { to: '/duplicates', label: 'Duplicates', Icon: DuplicatesIcon },
  { to: '/explore', label: 'Explore', Icon: ExploreIcon }
]
