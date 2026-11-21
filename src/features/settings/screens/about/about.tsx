import { Computed, Memo } from "@legendapp/state/react";
import { Typography } from "panelui-native/components/typography";
import { Frame } from "panelui-web/frame";
import { Switch } from "panelui-web/switch";
import { Icon, Icons } from "@/components/ui/icon";
import { Loader } from "@/components/ui/loader";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { updates$ } from "@/features/updates/state/updates";
import { desktop } from "@/utils/desktop";
import { openExternal } from "@/utils/open-external";
import { LINKS, VERSION_LABEL } from "./constants";
import { checkStatus, onCheck, toggleUpdateCheck, updateCheck$ } from "./utils";

/** The app's version and where it's made; the desktop app updates itself. */
export function About() {
  return (
    <SettingsPage title="About">
      <Frame>
        <Frame.Header>
          <Frame.Title>Anipoex</Frame.Title>
        </Frame.Header>
        <Frame.Panel data-attached="column">
          <Frame.Row>
            <Frame.Content>
              <Frame.Title as="p">Version</Frame.Title>
            </Frame.Content>
            <Frame.Actions>
              <Typography type="body-sm" muted>
                {VERSION_LABEL}
              </Typography>
            </Frame.Actions>
          </Frame.Row>
          {desktop ? (
            <>
              <Frame.Row onClick={onCheck}>
                <Frame.Content>
                  <Frame.Title as="p">Check for updates</Frame.Title>
                  <Frame.Description>
                    <Computed>{checkStatus}</Computed>
                  </Frame.Description>
                </Frame.Content>
                <Frame.Actions>
                  <Computed>
                    {() =>
                      updates$.checking.get() ? <Loader size="sm" /> : null
                    }
                  </Computed>
                </Frame.Actions>
              </Frame.Row>
              <Frame.Row
                // biome-ignore lint/a11y/noLabelWithoutControl: the Switch below is its control.
                render={<label />}
              >
                <Frame.Content>
                  <Frame.Title as="p">Check automatically</Frame.Title>
                  <Frame.Description>
                    Once a day, when you open the app
                  </Frame.Description>
                </Frame.Content>
                <Frame.Actions>
                  <Memo>
                    {() => (
                      <Switch
                        name="update-check"
                        label="Check automatically"
                        checked={updateCheck$.get() !== false}
                        onCheckedChange={toggleUpdateCheck}
                      />
                    )}
                  </Memo>
                </Frame.Actions>
              </Frame.Row>
            </>
          ) : null}
          {LINKS.map((link) => (
            <Frame.Row key={link.url} onClick={() => openExternal(link.url)}>
              <Frame.Media>
                <Icon name={link.icon} muted />
              </Frame.Media>
              <Frame.Content>
                <Frame.Title as="p">{link.label}</Frame.Title>
              </Frame.Content>
              <Frame.Actions>
                <Icon name={Icons.openExternal} size={16} muted />
              </Frame.Actions>
            </Frame.Row>
          ))}
        </Frame.Panel>
      </Frame>
    </SettingsPage>
  );
}
