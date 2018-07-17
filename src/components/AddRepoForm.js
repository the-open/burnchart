import React, { Component } from 'react';
import { connect } from "react-redux";
import Autosuggest from 'react-autosuggest';

import Icon from './Icon';
import S from './Space';

class AddRepoForm extends Component {

  constructor() {
    super();
    
    // Blank input.
    this.state = { val: '' };
    
    // Bindings.
    this.onChange = this.onChange.bind(this);
    this.onAdd = this.onAdd.bind(this);
    this.onGetList = this.onGetList.bind(this);
  }

  // Sign user in.
  onSignIn() {
    this.props.signIn();
  }

  onChange(evt, { newValue }) {
    this.setState({ val: newValue });
  }

  // Get a list of repo suggestions.
  onGetList({ value }) {
    this.props.searchRepos(value);
  }

  // What should be the value of the suggestion.
  getListValue(value) {
    return value;
  }

  // How do we render the repo?
  renderListValue(value) {
    return value;
  }

  // Add the project.
  onAdd() {
    const { val } = this.state;
    // Validate input.
    if (!/^[^\s/]+\/[^\s/]+$/.test(val)) return;
    const [ owner, name ] = val.split('/');
    this.props.addRepo({ owner, name });
    // Redirect to the dashboard.
    this.props.navigate('/');
  }

  render() {
    const { user } = this.props;
    let privateAccess;
    if (!(user != null && 'uid' in user)) {
      privateAccess = (
        <span><S />If you'd like to add a private GitHub repo,
        <S /><div className="link" onClick={this.onSignIn}>Sign In</div> first.</span>
      );
    }

    return (
      <div id="add">
        <div className="header">
          <h2>Add a Repo</h2>
          <div className="note">Type the name of a GitHub repository that has some
          projects with issues.{privateAccess}</div>
        </div>

        <div className="form">
          <table>
            <tbody>
              <tr>
                <td>
                  <Autosuggest
                    suggestions={this.props.suggestions || []}
                    getSuggestionValue={this.getListValue}
                    onSuggestionsFetchRequested={this.onGetList}
                    onSuggestionsClearRequested={() => {}}
                    renderSuggestion={this.renderListValue}
                    theme={{
                      container: 'suggest',
                      suggestionsContainer: 'list',
                      suggestion: 'item',
                      suggestionFocused: 'item focused'
                    }}
                    inputProps={{
                      placeholder: 'user/repo',
                      value: this.state.val,
                      onChange: this.onChange
                    }}
                  />
                </td>
                <td><div className="link" onClick={this.onAdd}>Add</div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="protip">
          <Icon name="rocket"/> Protip: To see if a project is on track or not,
          make sure it has a due date assigned to it.
        </div>
      </div>
    );
  }
}

const mapDispatch = dispatch => ({
  signIn: dispatch.account.signIn,
  searchRepos: dispatch.bank.searchRepos,
  addRepo: dispatch.bank.addRepo,
  navigate: dispatch.router.navigate
});

export default connect(null, mapDispatch)(AddRepoForm);
