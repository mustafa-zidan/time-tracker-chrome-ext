# Versioning and Release Process

This document outlines the versioning strategy and release process for Pharaohs Time Tracker.

## Versioning Strategy

We follow [Semantic Versioning (SemVer)](https://semver.org/) for all releases:

### Version Format: `MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0): Incompatible API changes, breaking changes, major architecture overhauls
- **MINOR** (X.Y.0): New functionality in a backwards-compatible manner
- **PATCH** (X.Y.Z): Backwards-compatible bug fixes, security patches

### Examples

```
2.0.0 - Complete rewrite (breaking changes)
2.1.0 - Added activity tagging feature (new functionality)
2.1.1 - Fixed date navigation bug (bug fix)
2.2.0 - Added data export feature (new functionality)
3.0.0 - Changed database schema (breaking change)
```

### Pre-release Versions

For beta releases, alpha releases, or release candidates:

- **Alpha**: `2.1.0-alpha.1`, `2.1.0-alpha.2`
- **Beta**: `2.1.0-beta.1`, `2.1.0-beta.2`
- **Release Candidate**: `2.1.0-rc.1`, `2.1.0-rc.2`

## Release Types

### Major Releases (X.0.0)

**When to release:**
- Breaking changes to user data or settings
- Major UI/UX overhauls
- Architecture changes (e.g., Manifest V2 → V3)
- Database schema changes requiring migration

**Requirements:**
- Migration guide for users
- Comprehensive testing
- Beta testing period recommended
- Updated documentation
- Chrome Web Store review

### Minor Releases (X.Y.0)

**When to release:**
- New features that don't break existing functionality
- Significant improvements to existing features
- New export formats, statistics, or UI components

**Requirements:**
- Feature testing
- Updated documentation
- Release notes highlighting new features

### Patch Releases (X.Y.Z)

**When to release:**
- Bug fixes
- Security patches
- Performance improvements
- Minor UI adjustments

**Requirements:**
- Bug fix testing
- Regression testing
- Concise release notes

## Release Process

### 1. Planning Phase

#### For Major/Minor Releases
1. **Create milestone** in GitHub for the target version
2. **Plan features** and create issues/tasks
3. **Set target date** (allow buffer time for testing)
4. **Assign responsibilities** for features and testing

#### For Patch Releases
1. **Identify bug** or security issue
2. **Assess severity** (critical patches may skip normal process)
3. **Create hotfix branch** if necessary

### 2. Development Phase

#### Branch Strategy
```
main                 # Production-ready code
├── develop         # Integration branch for features
├── feature/name    # Individual feature branches
├── bugfix/name     # Bug fix branches
└── hotfix/name     # Critical fixes for production
```

#### Development Workflow
1. **Create feature branch** from `develop`
2. **Implement changes** with tests
3. **Code review** via pull request
4. **Merge to develop** after approval
5. **Update documentation** as needed

### 3. Pre-Release Phase

#### Version Bump Checklist
- [ ] Update version in `package.json`
- [ ] Update version in `manifest.json`
- [ ] Update version in documentation
- [ ] Create changelog entry
- [ ] Update README if needed

#### Quality Assurance
```bash
# Run full test suite
npm test

# Check code quality
npm run lint
npm run type-check

# Create production build
npm run build

# Manual testing checklist
# - Load extension in Chrome
# - Test all major features
# - Test on different screen sizes
# - Verify no console errors
# - Check memory usage
```

#### Pre-release Testing
1. **Internal testing** by development team
2. **Beta release** for major features (optional)
3. **Documentation review** and updates
4. **Performance testing** if applicable

### 4. Release Phase

#### Release Preparation
1. **Create release branch** from `develop`
2. **Final version updates** in all files
3. **Generate changelog** entry
4. **Create release build**
5. **Final testing** of release build

#### Release Execution
1. **Merge release branch** to `main`
2. **Create Git tag** with version number
3. **Push to GitHub** with tags
4. **Create GitHub release** with release notes
5. **Deploy to Chrome Web Store** (if applicable)

#### Post-Release
1. **Merge main** back to `develop`
2. **Monitor** for issues or user feedback
3. **Update project status** and close milestone
4. **Announce release** if significant

### 5. Hotfix Process

For critical bugs in production:

1. **Create hotfix branch** from `main`
2. **Fix the issue** with minimal changes
3. **Test thoroughly** but expedite process
4. **Update version** (patch increment)
5. **Merge to main** and `develop`
6. **Deploy immediately** if critical

## Release Checklist

### Pre-Release Checklist

#### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] No console errors in production build
- [ ] Performance acceptable (extension loads < 1s)

#### Documentation
- [ ] CHANGELOG.md updated with new version
- [ ] README.md updated if features changed
- [ ] Release notes prepared
- [ ] Migration guide written (if breaking changes)
- [ ] API documentation updated (if applicable)

#### Version Management
- [ ] Version number incremented in `package.json`
- [ ] Version number updated in `manifest.json`
- [ ] Git tag created with version number
- [ ] Release branch created and tested

#### Testing
- [ ] All automated tests pass
- [ ] Manual testing completed
- [ ] Cross-browser compatibility verified
- [ ] Performance testing completed
- [ ] Security review completed (for major releases)

### Release Checklist

#### GitHub Release
- [ ] Create release from tag
- [ ] Upload release assets (ZIP file)
- [ ] Include release notes
- [ ] Mark as pre-release if applicable
- [ ] Announce to relevant channels

#### Chrome Web Store (if applicable)
- [ ] Upload new version
- [ ] Update store listing if needed
- [ ] Submit for review
- [ ] Monitor review status

#### Communication
- [ ] Update project documentation
- [ ] Notify beta testers (if applicable)
- [ ] Post announcement (if significant release)
- [ ] Update support documentation

### Post-Release Checklist

#### Monitoring
- [ ] Monitor for crash reports
- [ ] Check user feedback and reviews
- [ ] Monitor performance metrics
- [ ] Watch for GitHub issues

#### Follow-up
- [ ] Address any immediate issues
- [ ] Plan next release if needed
- [ ] Update project roadmap
- [ ] Document lessons learned

## Branch Management

### Main Branches

**main**: Production-ready code
- Always deployable
- Protected branch requiring reviews
- Only hotfixes and releases merge directly

**develop**: Integration branch
- Latest development changes
- Feature branches merge here
- Source for release branches

### Supporting Branches

**feature/**: New features
- Branch from: `develop`
- Merge to: `develop`
- Naming: `feature/activity-tagging`

**release/**: Release preparation
- Branch from: `develop`
- Merge to: `main` and `develop`
- Naming: `release/2.1.0`

**hotfix/**: Critical production fixes
- Branch from: `main`
- Merge to: `main` and `develop`
- Naming: `hotfix/2.0.1`

## Version Numbering Guidelines

### When to Increment MAJOR

- Chrome Extension Manifest version changes
- Database schema changes requiring migration
- Removal of existing features
- API changes affecting data export format
- UI changes that significantly alter user workflow

### When to Increment MINOR

- New features (activity tagging, themes, etc.)
- New export formats
- Significant UI improvements
- New statistics or analytics features
- Integration with external services

### When to Increment PATCH

- Bug fixes in existing functionality
- Performance improvements
- Security patches
- Minor UI adjustments
- Documentation fixes
- Dependency updates (unless breaking)

## Release Automation

### Automated Tasks

Consider automating these tasks with GitHub Actions:

1. **Version Bumping**: Automatic increment based on commit messages
2. **Changelog Generation**: From commit messages and PR titles
3. **Build Creation**: Automatic production builds on release
4. **Testing**: Full test suite on release candidates
5. **Deployment**: Automatic deployment to Chrome Web Store (with approval)

### Sample Release Command

```bash
# Release script example
npm version minor              # Bump version
npm run build                  # Create production build
git push origin main --tags    # Push with tags
npm run create-release         # Create GitHub release
```

## Communication

### Release Announcements

**Major Releases**:
- GitHub release with detailed notes
- Update project README
- Social media announcement (if applicable)
- Email to beta testers

**Minor Releases**:
- GitHub release
- Brief announcement in relevant channels

**Patch Releases**:
- GitHub release
- Minimal announcement for critical fixes

### User Communication

- Clear, user-focused release notes
- Migration instructions for breaking changes
- Links to support resources
- Acknowledgment of contributors and feedback

## Rollback Strategy

### When to Rollback

- Critical security vulnerabilities discovered
- Data loss or corruption issues
- Extension breaks core Chrome functionality
- High volume of user complaints about functionality

### Rollback Process

1. **Assess severity** and user impact
2. **Create hotfix** if issue can be quickly resolved
3. **Revert to previous version** if hotfix isn't feasible
4. **Communicate** clearly with users about the issue
5. **Fix underlying issue** before re-releasing

### Rollback Prevention

- Comprehensive testing before release
- Staged rollout for major releases
- Monitor user feedback closely after release
- Maintain automated testing for core functionality