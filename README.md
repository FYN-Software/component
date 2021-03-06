[![CodeFactor](https://www.codefactor.io/repository/github/fyn-software/component/badge/master)](https://www.codefactor.io/repository/github/fyn-software/component/overview/master)
[![DeepScan grade](https://deepscan.io/api/teams/4426/projects/6205/branches/50700/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=4426&pid=6205&bid=50700)

# component
Web component suite

## TODO's
- [FYN Core](https://github.com/FYN-Software/core)
  - [x] Extends (normalization and extension layer, dirty implemented, monkey-patched...)
  - [x] Events abstractions
  - [x] Mixins (To be convered to `decorators` if/when they hit browsers)
  - [x] Convert to Typescript
- [FYN Data](https://github.com/FYN-Software/data)
  - Base class (`Type`)
    - [x] Configuration API (couple of methods to configure your type)
  - Types
    - [x] `Boolean`
    - [x] `Number`
    - [x] `List`
    - [x] `Object`
    - [x] `Enum`
    - [x] `Datetime`
    - [x] `String`
  - Model (Will likally become a separate package)
    - [ ] Configuration API (API to define fields and relations)
    - [ ] Assingable data stores
  - Stores (Will likally become a separate package)
    - [ ] Configuration API
    - [ ] Assingable `Endpoint`
    - [ ] Assingable `Adapter`
  - [x] Convert to Typescript
  - [ ] Rewrite to make FYN Data types obsolete
- [FYN Component](https://github.com/FYN-Software/component)
  - [x] `Base`
  - [x] `Component`
  - [x] `Loop`
  - [x] `Generic`
  - [ ] `Behavior`
  - [x] Convert to Typescript
  - [ ] Rewrite to make FYN Data types obsolete
- [FYN Suite](https://github.com/FYN-Software/duite)
  - Common
    - Data
      - Chart
        - [ ] `Donut`
        - [ ] `Sparkline`
      - [x] `Table`
    - Form
      - [x] `Button`
      - [x] `Checkbox`
      - [x] `Color`
      - [x] `Datetime` (picker)
      - [x] `Dropdown` (Select/Combobox or any other name this common element is known by)
      - [x] `Font` (picker)
      - [x] `Form`
      - [x] `Group` (element to visually group/combine components)
      - [x] `Input` (text input field)
      - [x] `Slider`
    - Graphics
      - [x] `Flag`
      - [x] `Icon`
      - [x] `Image`
      - [x] `Progress`
    - Layout
      - [x] `Collapsable` (Probably will be to a `Behavior`)
      - [x] `Docks`
      - [x] `Grid`
      - [x] `List`
      - [x] `Resizable` (Probably will be to a `Behavior`)
      - [x] `Tabs`
    - Misc
      - [x] `Calander` (subcomponent for `Common.Form.Datetime')
      - [x] `Clock` (subcomponent for `Common.Form.Datetime')
    - Overlay
      - [x] `Dialog`
      - [x] `Modal` (Likally to be deprecated or converted to `Behavior`)
  - [ ] Convert to Typescript
  - [ ] Rewrite to make FYN Data types obsolete
