# Release Checklist

This comprehensive checklist ensures all steps are completed for a successful release of Pharaohs Time Tracker.

## Pre-Release Phase

### Code Preparation

#### Version Management
- [ ] Determine release type (major/minor/patch)
- [ ] Update version in `package.json`
- [ ] Update version in `manifest.json`
- [ ] Ensure versions match across all files
- [ ] Create release branch from `develop`

#### Code Quality
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`  
- [ ] Type checking passes: `npm run type-check`
- [ ] Code formatted: `npm run format`
- [ ] No console.log or debug code in production
- [ ] No TODO/FIXME comments for release-critical items

#### Build Validation
- [ ] Production build succeeds: `npm run build`
- [ ] All required files present in `dist/`:
  - [ ] `manifest.json`
  - [ ] `background.js`
  - [ ] `popup.html` and `popup.js`
  - [ ] `options.html` and `options.js`
  - [ ] `images/` directory with all icons
- [ ] Bundle size reasonable (< 1MB total)
- [ ] No development files in production build

#### Manual Testing
- [ ] Load extension as unpacked in Chrome
- [ ] Test all core features:
  - [ ] Start/stop activity tracking
  - [ ] Activity list displays correctly
  - [ ] Date navigation works
  - [ ] Edit activity functionality
  - [ ] Delete activity functionality
  - [ ] Activity duplication (double-click)
  - [ ] Badge updates in real-time
- [ ] Test options page:
  - [ ] Settings save correctly
  - [ ] Data export (JSON/CSV)
  - [ ] Data import from JSON
  - [ ] Statistics display
  - [ ] Clear data functionality
- [ ] Test error scenarios:
  - [ ] Invalid time inputs
  - [ ] Empty activity names
  - [ ] Network disconnection
  - [ ] Storage quota exceeded

#### Cross-Browser Testing
- [ ] Test in Chrome stable
- [ ] Test in Chrome beta (if available)
- [ ] Verify minimum Chrome version compatibility (88+)

### Documentation

#### Release Documentation
- [ ] Update `CHANGELOG.md` with new version
- [ ] Write release notes following template
- [ ] Update README if features changed
- [ ] Create migration guide (if breaking changes)
- [ ] Update screenshots (if UI changed)

#### Technical Documentation
- [ ] Update API documentation (if applicable)
- [ ] Update development documentation
- [ ] Verify all links work
- [ ] Check code comments are up-to-date

### Security Review

#### Code Security
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user data
- [ ] Proper error handling (no data exposure)
- [ ] Content Security Policy compliant
- [ ] Permissions minimal and justified

#### Dependency Security
- [ ] Run `npm audit` and address critical issues
- [ ] Update dependencies with security patches
- [ ] Review new dependencies for security

## Release Phase

### GitHub Release

#### Repository Preparation
- [ ] Merge release branch to `main`
- [ ] Create and push Git tag: `git tag v2.0.0 && git push origin v2.0.0`
- [ ] Verify GitHub Actions CI passes
- [ ] All GitHub issues for milestone closed or moved

#### Release Creation
- [ ] GitHub release created automatically (or manually)
- [ ] Release notes complete and user-friendly
- [ ] Extension ZIP file attached to release
- [ ] Mark as pre-release if applicable
- [ ] Release published and visible

### Chrome Web Store (if publishing)

#### Store Preparation
- [ ] Developer account in good standing
- [ ] Privacy policy accessible and current
- [ ] Store listing information updated
- [ ] Screenshots current (if UI changed)
- [ ] Store description accurate

#### Upload Process
- [ ] ZIP file uploaded to Chrome Web Store
- [ ] Store listing reviewed and accurate
- [ ] Privacy practices declared correctly
- [ ] Submit for review
- [ ] Review status monitored

### Communication

#### Internal
- [ ] Development team notified
- [ ] Project status updated
- [ ] Milestone closed in GitHub
- [ ] Next version planning begun

#### External (if applicable)
- [ ] Beta testers notified
- [ ] Community announcement made
- [ ] Social media updates posted
- [ ] Website/documentation updated

## Post-Release Phase

### Monitoring

#### Technical Monitoring
- [ ] Monitor for crash reports
- [ ] Check GitHub issues for new problems
- [ ] Monitor Chrome Web Store reviews
- [ ] Verify extension loads correctly for new users

#### User Feedback
- [ ] Respond to user reviews
- [ ] Address GitHub issues promptly  
- [ ] Monitor support channels
- [ ] Track user adoption metrics

#### Performance Monitoring
- [ ] Monitor extension performance metrics
- [ ] Check for memory leaks in long sessions
- [ ] Verify badge updates working correctly
- [ ] Monitor database performance

### Follow-up Actions

#### Bug Fixes
- [ ] Address any critical issues immediately
- [ ] Plan hotfix if necessary
- [ ] Document issues for future releases

#### Repository Maintenance
- [ ] Merge `main` back to `develop`
- [ ] Update project boards/kanban
- [ ] Archive release branch
- [ ] Tag any related issues with release version

#### Planning
- [ ] Review release process for improvements
- [ ] Plan next release timeline
- [ ] Update project roadmap
- [ ] Gather feedback for future releases

## Emergency Procedures

### Critical Issues
If critical issues are discovered:

- [ ] **Assess severity** and user impact
- [ ] **Create hotfix branch** from `main`
- [ ] **Fix issue** with minimal changes
- [ ] **Test fix** thoroughly but quickly
- [ ] **Release hotfix** following abbreviated process
- [ ] **Communicate** with users about fix

### Rollback Process
If rollback is necessary:

- [ ] **Document reason** for rollback
- [ ] **Revert to previous version** in Chrome Web Store
- [ ] **Create GitHub issue** describing the problem
- [ ] **Communicate** with users about rollback
- [ ] **Fix underlying issue** before re-releasing

## Release Types

### Major Release (X.0.0)
Additional checks for major releases:

- [ ] **Breaking changes documented** thoroughly
- [ ] **Migration guide** comprehensive and tested
- [ ] **Beta release** conducted (recommended)
- [ ] **Extended testing period** completed
- [ ] **User communication** about changes
- [ ] **Support preparation** for user questions

### Minor Release (X.Y.0)
Standard release process with:

- [ ] **New features tested** extensively
- [ ] **Feature documentation** complete
- [ ] **Backward compatibility** verified

### Patch Release (X.Y.Z)
Streamlined process focusing on:

- [ ] **Bug fix verification** thorough
- [ ] **Regression testing** completed
- [ ] **Quick turnaround** for critical fixes

## Tools and Commands

### Useful Commands
```bash
# Version management
npm version patch|minor|major
git tag v$(node -p "require('./package.json').version")

# Quality checks
npm run lint && npm run type-check && npm test

# Build and package
npm run build
cd dist && zip -r ../extension.zip . && cd ..

# Release validation
# Manual testing checklist above
```

### GitHub CLI (optional)
```bash
# Create release with GitHub CLI
gh release create v2.0.0 extension.zip \
  --title "Pharaohs Time Tracker v2.0.0" \
  --notes-file release_notes.md
```

## Sign-off

### Release Manager Verification
- [ ] **All checklist items completed**
- [ ] **Testing completed successfully**
- [ ] **Documentation up-to-date**
- [ ] **Security review passed**
- [ ] **Ready for deployment**

**Release Manager:** _________________ **Date:** _________

### Post-Release Confirmation
- [ ] **Release deployed successfully**
- [ ] **Monitoring active**
- [ ] **No critical issues reported**
- [ ] **User feedback positive**

**Confirmed by:** _________________ **Date:** _________

---

*This checklist should be completed for every release, with items checked off as they are completed. Store completed checklists for reference and process improvement.*